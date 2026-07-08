import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    
    dbs = await client.list_database_names()
    print("Databases in MongoDB:")
    for db_name in dbs:
        print(f"\nDatabase: {db_name}")
        db = client[db_name]
        cols = await db.list_collection_names()
        print(f"  Collections: {cols}")
        if 'users' in cols:
            users = await db.users.find().to_list(length=10)
            print("  Users:")
            for u in users:
                print(f"    Email: {u.get('email')}, Role: {u.get('role')}, ID: {u.get('id')}, Dept: {u.get('department')}")
                
    client.close()

if __name__ == '__main__':
    asyncio.run(main())
