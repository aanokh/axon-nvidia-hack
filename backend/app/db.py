from sqlalchemy.ext.asyncio import create_async_engine
import os

db_user = os.getenv("DB_USER")
db_pass = os.getenv("DB_PASSWORD")
db_name = os.getenv("DB_NAME")

db_url = "postgresql+asyncpg://{db_user}:{db_pass}@db:5432/{db_name}"
db_engine = create_async_engine(os.getenv("QDRANT_URL"))

async def test_connection():
    async with db_engine.begin() as conn:
        # simple sanity check
        result = await conn.execute(text("SELECT NOW()"))
        now = result.scalar()
        print(f"DB time is {now!r}")