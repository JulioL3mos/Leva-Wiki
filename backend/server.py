from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Portal LEVA API")

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
    await seed_admin(db)
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
