from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv() # Fallback to current dir

import os
import logging
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth import router as auth_router, seed_admin, create_indexes as create_auth_indexes
from wiki import router as wiki_router, create_indexes as create_wiki_indexes
from files import router as files_router
from users_admin import router as users_router
from storage_client import init_storage
from training import router as training_router, create_indexes as create_training_indexes

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

if not mongo_url or not db_name:
    logger.error(f"Erro: Variáveis de ambiente faltando. MONGO_URL: {bool(mongo_url)}, DB_NAME: {bool(db_name)}")
    logger.error(f"Procurando arquivo .env em: {env_path.absolute()}")
    raise KeyError("As variáveis MONGO_URL e DB_NAME devem estar no arquivo .env")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="Portal LEVA API")

@app.get("/")
async def root():
    return {
        "message": "Portal LEVA - Backend Ativo",
        "api_root": "/api",
        "docs": "/docs",
        "status": "online"
    }

# Make db available to routers via app state
app.state.db = db

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Portal LEVA API", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


app.include_router(api_router)
app.include_router(auth_router, prefix="/api")
app.include_router(wiki_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(training_router, prefix="/api")

# CORS — allow frontend origin with credentials
frontend_url = os.environ.get("FRONTEND_URL", "*")
allow_origins = [frontend_url] if frontend_url != "*" else ["*"]
# If wildcard with credentials: switch to regex
if frontend_url == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
async def on_startup():
    await create_auth_indexes(db)
    await create_wiki_indexes(db)
    await create_training_indexes(db)
    await seed_admin(db)
    try:
        init_storage()
        logger.info("Storage initialized successfully")
    except Exception as e:
        logger.warning(f"Storage not initialized (Optional): {e}")
        logger.info("The system will work, but file uploads might be disabled.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
