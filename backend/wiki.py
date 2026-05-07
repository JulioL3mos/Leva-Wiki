import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel, Field

from auth import get_current_user, require_role

router = APIRouter(tags=["wiki"])


# ---------- Models ----------

class Block(BaseModel):
    id: str
    type: str  # paragraph, h1, h2, h3, bulleted, numbered, quote, code, divider, image
    content: str = ""
    meta: dict = {}


class ArticleCreate(BaseModel):
    title: str = Field(min_length=1)
    summary: Optional[str] = ""
    category: Optional[str] = "Geral"
    tags: List[str] = []
    blocks: List[Block] = []
    status: str = "published"  # draft | pending | published


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    blocks: Optional[List[Block]] = None
    status: Optional[str] = None


class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "FileText"
    description: Optional[str] = ""


# ---------- Helpers ----------

def now_iso():
    return datetime.now(timezone.utc).isoformat()


def serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc = {k: v for k, v in doc.items() if k != "_id"}
    return doc


# ---------- Article Endpoints ----------

@router.post("/wiki/articles")
async def create_article(req: ArticleCreate, request: Request, user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="Apenas editores podem criar artigos")
    db = request.app.state.db
    article_id = str(uuid.uuid4())
    # If editor and not admin, force pending
    status = req.status
    if user["role"] == "editor" and status == "published":
        status = "pending"
    doc = {
        "id": article_id,
        "title": req.title.strip(),
        "summary": (req.summary or "").strip(),
        "category": req.category or "Geral",
        "tags": [t.strip() for t in req.tags if t.strip()],
        "blocks": [b.model_dump() for b in req.blocks],
        "status": status,
        "author_id": user["id"],
        "author_name": user["name"],
        "view_count": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.articles.insert_one(doc)
    # First version
    await db.article_versions.insert_one({
        "id": str(uuid.uuid4()),
        "article_id": article_id,
        "version": 1,
        "title": doc["title"],
        "blocks": doc["blocks"],
        "edited_by_id": user["id"],
        "edited_by_name": user["name"],
        "created_at": now_iso(),
    })
    return serialize(doc)


@router.get("/wiki/articles")
async def list_articles(
    request: Request,
    user: dict = Depends(get_current_user),
    q: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    sort: str = "recent",  # recent | views | alpha
):
    db = request.app.state.db
    query: dict = {}
    # Non-admins only see published
    if user["role"] not in ("admin",):
        if status == "pending" and user["role"] != "editor":
            raise HTTPException(status_code=403, detail="forbidden")
        if not status:
            query["status"] = "published"
        else:
            query["status"] = status
    elif status:
        query["status"] = status
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"summary": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    sort_spec = [("updated_at", -1)]
    if sort == "views":
        sort_spec = [("view_count", -1)]
    elif sort == "alpha":
        sort_spec = [("title", 1)]
    cursor = db.articles.find(query, {"_id": 0, "blocks": 0}).sort(sort_spec).limit(limit)
    return await cursor.to_list(length=limit)


@router.get("/wiki/articles/{article_id}")
async def get_article(article_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    doc = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    if doc.get("status") != "published" and user["role"] not in ("admin", "editor") and doc.get("author_id") != user["id"]:
        raise HTTPException(status_code=403, detail="forbidden")
    # Increment view count
    await db.articles.update_one({"id": article_id}, {"$inc": {"view_count": 1}})
    doc["view_count"] = doc.get("view_count", 0) + 1
    return doc


@router.patch("/wiki/articles/{article_id}")
async def update_article(article_id: str, req: ArticleUpdate, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    existing = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    if user["role"] not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="forbidden")
    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if "blocks" in update:
        # Save version
        version_count = await db.article_versions.count_documents({"article_id": article_id})
        await db.article_versions.insert_one({
            "id": str(uuid.uuid4()),
            "article_id": article_id,
            "version": version_count + 1,
            "title": update.get("title", existing["title"]),
            "blocks": update["blocks"],
            "edited_by_id": user["id"],
            "edited_by_name": user["name"],
            "created_at": now_iso(),
        })
    if user["role"] == "editor" and update.get("status") == "published":
        update["status"] = "pending"
    update["updated_at"] = now_iso()
    await db.articles.update_one({"id": article_id}, {"$set": update})
    new = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return new


@router.delete("/wiki/articles/{article_id}")
async def delete_article(article_id: str, request: Request, user: dict = Depends(require_role("admin", "editor"))):
    db = request.app.state.db
    res = await db.articles.delete_one({"id": article_id})
    await db.article_versions.delete_many({"article_id": article_id})
    return {"deleted": res.deleted_count}


@router.get("/wiki/articles/{article_id}/versions")
async def list_versions(article_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    cursor = db.article_versions.find({"article_id": article_id}, {"_id": 0}).sort([("version", -1)])
    return await cursor.to_list(length=200)


# ---------- Categories ----------

DEFAULT_CATEGORIES = [
    {"name": "Onboarding", "icon": "Sparkles", "description": "Boas-vindas e integração de novos colaboradores"},
    {"name": "Processos", "icon": "GitBranch", "description": "Procedimentos operacionais padrão"},
    {"name": "Treinamentos", "icon": "GraduationCap", "description": "Materiais de capacitação"},
    {"name": "Manuais Técnicos", "icon": "Wrench", "description": "Documentação técnica"},
    {"name": "FAQ", "icon": "HelpCircle", "description": "Perguntas frequentes"},
    {"name": "Renault", "icon": "Car", "description": "Conhecimento da bandeira Renault"},
    {"name": "Geely", "icon": "Car", "description": "Conhecimento da bandeira Geely"},
    {"name": "Bajaj", "icon": "Bike", "description": "Conhecimento da bandeira Bajaj"},
    {"name": "Geral", "icon": "FileText", "description": "Conteúdo geral"},
]


@router.get("/wiki/categories")
async def list_categories(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    cats = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(length=200)
    if not cats:
        # Lazy seed defaults
        docs = [{"id": str(uuid.uuid4()), **c, "created_at": now_iso()} for c in DEFAULT_CATEGORIES]
        await db.categories.insert_many(docs)
        cats = [{k: v for k, v in d.items() if k != "_id"} for d in docs]
    # Counts per category
    pipeline = [{"$match": {"status": "published"}}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    counts = {row["_id"]: row["count"] async for row in db.articles.aggregate(pipeline)}
    for c in cats:
        c["article_count"] = counts.get(c["name"], 0)
    return cats


@router.post("/wiki/categories")
async def create_category(req: CategoryCreate, request: Request, user: dict = Depends(require_role("admin"))):
    db = request.app.state.db
    if await db.categories.find_one({"name": req.name}):
        raise HTTPException(status_code=400, detail="Categoria já existe")
    doc = {"id": str(uuid.uuid4()), "name": req.name, "icon": req.icon, "description": req.description or "", "created_at": now_iso()}
    await db.categories.insert_one(doc)
    return serialize(doc)


# ---------- Tags ----------

@router.get("/wiki/tags")
async def list_tags(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    pipeline = [
        {"$match": {"status": "published"}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 50},
    ]
    rows = [{"name": r["_id"], "count": r["count"]} async for r in db.articles.aggregate(pipeline)]
    return rows


# ---------- Dashboard / Stats ----------

@router.get("/dashboard/stats")
async def dashboard_stats(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    total = await db.articles.count_documents({"status": "published"})
    pending = await db.articles.count_documents({"status": "pending"})
    drafts = await db.articles.count_documents({"status": "draft"})
    users_count = await db.users.count_documents({})
    files_count = await db.files.count_documents({"is_deleted": False})

    recent = await db.articles.find({"status": "published"}, {"_id": 0, "blocks": 0}).sort("updated_at", -1).limit(5).to_list(length=5)
    popular = await db.articles.find({"status": "published"}, {"_id": 0, "blocks": 0}).sort("view_count", -1).limit(5).to_list(length=5)
    pipeline = [{"$match": {"status": "published"}}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    by_category = [{"category": r["_id"], "count": r["count"]} async for r in db.articles.aggregate(pipeline)]

    return {
        "total_articles": total,
        "pending_articles": pending,
        "draft_articles": drafts,
        "users_count": users_count,
        "files_count": files_count,
        "recent_articles": recent,
        "popular_articles": popular,
        "by_category": by_category,
    }


# ---------- Indexes ----------

async def create_indexes(db):
    await db.articles.create_index("id", unique=True)
    await db.articles.create_index("category")
    await db.articles.create_index("tags")
    await db.articles.create_index("status")
    await db.articles.create_index([("title", "text"), ("summary", "text")])
    await db.categories.create_index("name", unique=True)
    await db.article_versions.create_index("article_id")
