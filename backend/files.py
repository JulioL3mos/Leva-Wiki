import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends, Form, Query
from fastapi.responses import Response
from typing import Optional

from auth import get_current_user, require_role
from storage_client import put_object, get_object, APP_NAME

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "text/plain", "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form("Geral"),
    description: str = Form(""),
    user: dict = Depends(get_current_user),
):
    if user["role"] not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="Apenas editores podem fazer upload")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo não permitido: {file.content_type}")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máx 200MB)")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin").lower()
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{user['id']}/{file_id}.{ext}"
    try:
        result = put_object(path, data, file.content_type or "application/octet-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha no upload: {e}")
    db = request.app.state.db
    record = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "category": category,
        "description": description,
        "uploaded_by_id": user["id"],
        "uploaded_by_name": user["name"],
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.files.insert_one(record)
    record.pop("_id", None)
    return record


@router.get("")
async def list_files(
    request: Request,
    user: dict = Depends(get_current_user),
    category: Optional[str] = None,
    q: Optional[str] = None,
):
    db = request.app.state.db
    query: dict = {"is_deleted": False}
    if category:
        query["category"] = category
    if q:
        query["original_filename"] = {"$regex": q, "$options": "i"}
    cursor = db.files.find(query, {"_id": 0}).sort("created_at", -1).limit(200)
    return await cursor.to_list(length=200)


@router.get("/{file_id}/download")
async def download_file(file_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    try:
        data, content_type = get_object(record["storage_path"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar arquivo: {e}")
    return Response(content=data, media_type=record.get("content_type", content_type),
                    headers={"Content-Disposition": f'inline; filename="{record["original_filename"]}"'})


@router.get("/raw/{path:path}")
async def get_raw_file(path: str):
    """Rota para visualizar arquivos diretamente (ex: imagens no editor)."""
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")


@router.delete("/{file_id}")
async def delete_file(file_id: str, request: Request, user: dict = Depends(require_role("admin", "editor"))):
    db = request.app.state.db
    res = await db.files.update_one({"id": file_id}, {"$set": {"is_deleted": True, "deleted_at": now_iso()}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return {"deleted": True}
