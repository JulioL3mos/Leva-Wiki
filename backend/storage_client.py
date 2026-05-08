import os
from pathlib import Path

# Configuração para armazenamento local
ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

APP_NAME = "portal-leva"

def init_storage():
    """Inicializa o diretório de uploads local."""
    if not UPLOAD_DIR.exists():
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return str(UPLOAD_DIR)

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Salva um arquivo localmente."""
    # O path vem como "portal-leva/uploads/user_id/file_id.ext"
    # Vamos simplificar para salvar dentro da nossa pasta uploads
    relative_path = path.replace(f"{APP_NAME}/", "")
    full_path = UPLOAD_DIR / relative_path
    
    # Criar subpastas se necessário
    full_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(full_path, "wb") as f:
        f.write(data)
    
    return {
        "path": relative_path,
        "size": len(data),
        "status": "success"
    }

def get_object(path: str):
    """Recupera um arquivo local."""
    full_path = UPLOAD_DIR / path
    if not full_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {path}")
    
    with open(full_path, "rb") as f:
        content = f.read()
    
    # Tenta deduzir o content type pela extensão se possível
    import mimetypes
    content_type, _ = mimetypes.guess_type(full_path)
    return content, content_type or "application/octet-stream"
