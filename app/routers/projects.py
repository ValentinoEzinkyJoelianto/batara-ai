import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_instructor
from app.models import Class, ClassEnrollment, InstructorReview, Project, User
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate, ReviewCreate, ReviewOut

router = APIRouter(prefix="/projects", tags=["projects"])


async def _is_class_instructor_for(project: Project, current_user: User, db: AsyncSession) -> bool:
    if not project.class_id:
        return False
    class_result = await db.execute(select(Class).where(Class.id == project.class_id))
    cls = class_result.scalar_one_or_none()
    return cls is not None and cls.instructor_id == current_user.id


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        workspace_json=payload.workspace_json,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/me", response_model=list[ProjectOut])
async def list_my_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.owner_id == current_user.id))
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project.owner_id == current_user.id
    if not is_owner and not await _is_class_instructor_for(project, current_user, db):
        raise HTTPException(status_code=403, detail="Not your project")

    return project


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your project")

    update_data = payload.model_dump(exclude_unset=True)

    # If the student is assigning this project to a class, make sure they're
    # actually enrolled in it — otherwise they could tag their project to any
    # instructor's class without belonging to it.
    if "class_id" in update_data and update_data["class_id"] is not None:
        enrollment_result = await db.execute(
            select(ClassEnrollment).where(
                ClassEnrollment.class_id == update_data["class_id"],
                ClassEnrollment.student_id == current_user.id,
            )
        )
        if not enrollment_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="You are not enrolled in that class")

    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project


@router.post("/{project_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    project_id: uuid.UUID,
    payload: ReviewCreate,
    current_user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not await _is_class_instructor_for(project, current_user, db):
        raise HTTPException(status_code=403, detail="Not your class")

    review = InstructorReview(
        project_id=project_id,
        instructor_id=current_user.id,
        status=payload.status,
        comment=payload.comment,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


@router.get("/{project_id}/reviews", response_model=list[ReviewOut])
async def list_reviews(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project.owner_id == current_user.id
    if not is_owner and not await _is_class_instructor_for(project, current_user, db):
        raise HTTPException(status_code=403, detail="Not your project")

    reviews_result = await db.execute(
        select(InstructorReview)
        .where(InstructorReview.project_id == project_id)
        .order_by(InstructorReview.created_at.desc())
    )
    return reviews_result.scalars().all()