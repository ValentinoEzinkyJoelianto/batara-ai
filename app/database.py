import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

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
