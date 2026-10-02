import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ForumPost, ForumThread, Project, User
from app.schemas import PostCreate, PostOut, ThreadCreate, ThreadWithAuthorOut

router = APIRouter(prefix="/forum", tags=["forum"])


@router.get("/threads", response_model=list[ThreadWithAuthorOut])
async def list_threads(
    project_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(
            ForumThread,
            User.name.label("author_name"),
            func.count(ForumPost.id).label("post_count"),
        )
        .join(User, User.id == ForumThread.created_by)
        .outerjoin(ForumPost, ForumPost.thread_id == ForumThread.id)
        .group_by(ForumThread.id, User.name)
        .order_by(ForumThread.created_at.desc())
    )
    if project_id is not None:
        query = query.where(ForumThread.project_id == project_id)

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": thread.id,
            "project_id": thread.project_id,
            "title": thread.title,
            "created_by": thread.created_by,
            "author_name": author_name,
            "post_count": post_count,
            "created_at": thread.created_at,
        }
        for thread, author_name, post_count in rows
    ]


@router.post("/threads", response_model=ThreadWithAuthorOut, status_code=status.HTTP_201_CREATED)
async def create_thread(
    payload: ThreadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.project_id is not None:
        project_result = await db.execute(select(Project).where(Project.id == payload.project_id))
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Project not found")

    thread = ForumThread(
        project_id=payload.project_id,
        title=payload.title,
        created_by=current_user.id,
    )
    db.add(thread)
    await db.commit()
    await db.refresh(thread)

    return {
        "id": thread.id,
        "project_id": thread.project_id,
        "title": thread.title,
        "created_by": thread.created_by,
        "author_name": current_user.name,
        "post_count": 0,
        "created_at": thread.created_at,
    }


@router.get("/threads/{thread_id}/posts", response_model=list[PostOut])
async def list_posts(
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    thread_result = await db.execute(select(ForumThread).where(ForumThread.id == thread_id))
    if not thread_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Thread not found")

    result = await db.execute(
        select(ForumPost, User.name.label("author_name"))
        .join(User, User.id == ForumPost.author_id)
        .where(ForumPost.thread_id == thread_id)
        .order_by(ForumPost.created_at.asc())
    )
    rows = result.all()

    return [
        {
            "id": post.id,
            "thread_id": post.thread_id,
            "author_id": post.author_id,
            "author_name": author_name,
            "content": post.content,
            "created_at": post.created_at,
        }
        for post, author_name in rows
    ]


@router.post("/threads/{thread_id}/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    thread_id: uuid.UUID,
    payload: PostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    thread_result = await db.execute(select(ForumThread).where(ForumThread.id == thread_id))
    if not thread_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Thread not found")

    post = ForumPost(
        thread_id=thread_id,
        author_id=current_user.id,
        content=payload.content,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    return {
        "id": post.id,
        "thread_id": post.thread_id,
        "author_id": post.author_id,
        "author_name": current_user.name,
        "content": post.content,
        "created_at": post.created_at,
    }