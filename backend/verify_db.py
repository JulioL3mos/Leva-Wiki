import asyncio
import os
# pyrefly: ignore [missing-import]
import bcrypt
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'LEVA_DB')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check users
    print(f"Connecting to: {db_name}")
    users = await db.users.find().to_list(length=100)
    for u in users:
        print(f"ID: {u.get('id')}, Email: {u.get('email')}, Role: {u.get('role')}, Department: {u.get('department')}, Active: {u.get('is_active')}")
        # Verify password
        is_editor123 = bcrypt.checkpw("editor123".encode('utf-8'), u.get('password_hash').encode('utf-8')) if u.get('password_hash') else False
        is_admin123 = bcrypt.checkpw("admin123".encode('utf-8'), u.get('password_hash').encode('utf-8')) if u.get('password_hash') else False
        print(f"  Password is 'editor123': {is_editor123}")
        print(f"  Password is 'admin123': {is_admin123}")

    client.close()

if __name__ == '__main__':
    asyncio.run(main())
