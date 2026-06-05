import os
import uuid
import bcrypt
# pyrefly: ignore [missing-import]
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

JWT_ALGORITHM = "HS256"
ACCESS_MIN = 60 * 8  # 8 hours for usability in internal tool
REFRESH_DAYS = 7
LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15

router = APIRouter(prefix="/auth", tags=["auth"])


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax",
                        max_age=ACCESS_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax",
                        max_age=REFRESH_DAYS * 86400, path="/")


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


# ---------- Models ----------

class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar_url: Optional[str] = None
    created_at: str


class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: Optional[str] = "viewer"  # admin can set role on creation


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class PasswordChangeReq(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class UserUpdateReq(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


# ---------- Auth dependency ----------

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        db = request.app.state.db
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dep
    

# ---------- Brute force ----------

async def check_brute_force(db, identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("locked_until"):
        locked_until = datetime.fromisoformat(rec["locked_until"])
        if locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")


async def record_failed_attempt(db, identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    count = (rec.get("count") if rec else 0) + 1
    update = {"count": count, "last_attempt": datetime.now(timezone.utc).isoformat()}
    if count >= LOCKOUT_THRESHOLD:
        update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
        update["count"] = 0
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$set": {**update, "identifier": identifier}},
        upsert=True,
    )


async def clear_attempts(db, identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


# ---------- Endpoints ----------

@router.post("/register")
async def register(req: RegisterReq, request: Request, response: Response, user: dict = Depends(require_role("admin"))):
    db = request.app.state.db
    email = req.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    allowed_roles = ("admin", "editor", "viewer")
    role = req.role if req.role in allowed_roles else "viewer"
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": req.name.strip(),
        "password_hash": hash_password(req.password),
        "role": role,
        "avatar_url": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
    }
    await db.users.insert_one(user_doc)
    public = {k: v for k, v in user_doc.items() if k not in ("password_hash", "_id")}
    return public


@router.post("/login")
async def login(req: LoginReq, request: Request, response: Response):
    db = request.app.state.db
    email = req.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    await check_brute_force(db, identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        await record_failed_attempt(db, identifier)
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Conta desativada")
    await clear_attempts(db, identifier)
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    user.pop("_id", None)
    user.pop("password_hash", None)
    return user


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/change-password")
async def change_password(req: PasswordChangeReq, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    # Buscar usuário com o hash da senha
    full_user = await db.users.find_one({"id": user["id"]})
    if not verify_password(req.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": new_hash}}
    )
    return {"message": "Senha alterada com sucesso"}


@router.patch("/update-profile")
async def update_profile(req: UserUpdateReq, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name.strip()
    if req.avatar_url is not None:
        update_data["avatar_url"] = req.avatar_url

    if not update_data:
        return user

    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated_user


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        db = request.app.state.db
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"], user["role"])
        response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax",
                            max_age=ACCESS_MIN * 60, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ---------- Indexes & Seed ----------

async def create_indexes(db):
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.login_attempts.create_index("identifier")


async def seed_admin(db):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@levaportal.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    admin_name = os.environ.get("ADMIN_NAME", "Administrador LEVA")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": admin_name,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True,
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )

    # Seed test editor user
    editor_email = "editor@levaportal.com"
    editor_password = "editor123"
    if not await db.users.find_one({"email": editor_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": editor_email,
            "name": "Editor LEVA",
            "password_hash": hash_password(editor_password),
            "role": "editor",
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True,
        })

    # Write credentials file
    try:
        os.makedirs("/app/memory", exist_ok=True)
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write(
                f"# Portal LEVA — Test Credentials\n\n"
                f"## Admin\n- Email: `{admin_email}`\n- Password: `{admin_password}`\n- Role: admin\n\n"
                f"## Editor\n- Email: `{editor_email}`\n- Password: `{editor_password}`\n- Role: editor\n\n"
                f"## Auth endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n"
            )
    except Exception:
        pass
