from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone

from auth import get_current_user, require_role, hash_password

router = APIRouter(tags=["admin"])


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None  # admin | editor | viewer
    department: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


@router.get("/admin/users")
async def list_users(request: Request, user: dict = Depends(require_role("admin"))):
    db = request.app.state.db
    cursor = db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1)
    return await cursor.to_list(length=500)


@router.patch("/admin/users/{user_id}")
async def update_user(user_id: str, req: UserUpdate, request: Request, user: dict = Depends(require_role("admin"))):
    db = request.app.state.db
    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if "password" in update:
        update["password_hash"] = hash_password(update.pop("password"))
    if "role" in update and update["role"] not in ("admin", "editor", "viewer"):
        raise HTTPException(status_code=400, detail="Role inválido")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.users.update_one({"id": user_id}, {"$set": update})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    new = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return new


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, request: Request, user: dict = Depends(require_role("admin"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Não é possível excluir a si mesmo")
    
    db = request.app.state.db
    
    # Verificar se o usuário existe
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Delete em cascata - remover dados associados
    await db.articles.delete_many({"author_id": user_id})
    await db.user_progress.delete_many({"user_id": user_id})
    await db.quiz_results.delete_many({"user_id": user_id})
    
    # Deletar o usuário
    await db.users.delete_one({"id": user_id})
    
    return {
        "deleted": True,
        "message": f"Usuário {target_user.get('name', 'desconhecido')} e seus dados foram removidos com sucesso"
    }


@router.get("/admin/pending-articles")
async def pending_articles(request: Request, user: dict = Depends(require_role("admin"))):
    db = request.app.state.db
    cursor = db.articles.find({"status": "pending"}, {"_id": 0, "blocks": 0}).sort("updated_at", -1)
    return await cursor.to_list(length=200)


@router.post("/admin/articles/{article_id}/approve")
async def approve_article(article_id: str, request: Request, user: dict = Depends(require_role("admin"))):
    db = request.app.state.db
    res = await db.articles.update_one({"id": article_id}, {"$set": {"status": "published", "updated_at": datetime.now(timezone.utc).isoformat()}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    return {"approved": True}


@router.post("/admin/articles/{article_id}/reject")
async def reject_article(article_id: str, request: Request, user: dict = Depends(require_role("admin"))):
    db = request.app.state.db
    res = await db.articles.update_one({"id": article_id}, {"$set": {"status": "draft", "updated_at": datetime.now(timezone.utc).isoformat()}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    return {"rejected": True}
