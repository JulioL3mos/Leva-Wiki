import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from auth import seed_admin

async def main():
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'LEVA_DB')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    print(f"Connecting to DB: {db_name}")
    await seed_admin(db)
    await db.login_attempts.delete_many({})
    print("Seed complete and login attempts cleared!")
    client.close()

if __name__ == '__main__':
    asyncio.run(main())
