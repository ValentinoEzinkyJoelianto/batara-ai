import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Neon gives you a postgresql:// URL with ?sslmode=require. The asyncpg driver
# doesn't understand that query param the same way psycopg2 does, so we strip
# it and pass SSL explicitly via connect_args instead.
raw_url = settings.database_url.split("?")[0]
async_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

ssl_context = ssl.create_default_context()

engine = create_async_engine(
    async_url,
    echo=False,
    pool_pre_ping=True,
    connect_args={"ssl": ssl_context, "statement_cache_size": 0},
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
