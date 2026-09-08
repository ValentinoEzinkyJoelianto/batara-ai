import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_instructor
from app.models import Class, ClassEnrollment, Project, User
from app.schemas import ClassCreate, ClassEnrollmentOut, ClassOut, EnrollStudentRequest

router = APIRouter(prefix="/classes", tags=["classes"])


@router.get("/enrolled-in", response_model=list[ClassOut])
async def list_classes_im_enrolled_in(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Class)
        .join(ClassEnrollment, ClassEnrollment.class_id == Class.id)
        .where(ClassEnrollment.student_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: ClassCreate,
    current_user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    new_class = Class(
        name=payload.name,
        institution=payload.institution,
        instructor_id=current_user.id,
    )
    db.add(new_class)
    await db.commit()
    await db.refresh(new_class)
    return new_class


@router.get("/mine", response_model=list[ClassOut])
async def list_my_classes(
    current_user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Class).where(Class.instructor_id == current_user.id))
    return result.scalars().all()


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: uuid.UUID,
    current_user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    class_result = await db.execute(select(Class).where(Class.id == class_id))
    target_class = class_result.scalar_one_or_none()
    if not target_class:
        raise HTTPException(status_code=404, detail="Class not found")
    if target_class.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your class")

    await db.delete(target_class)
    await db.commit()


@router.post("/{class_id}/enroll", response_model=ClassEnrollmentOut, status_code=status.HTTP_201_CREATED)
async def enroll_student(
    class_id: uuid.UUID,
    payload: EnrollStudentRequest,
    current_user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    class_result = await db.execute(select(Class).where(Class.id == class_id))
    target_class = class_result.scalar_one_or_none()
    if not target_class:
        raise HTTPException(status_code=404, detail="Class not found")
    if target_class.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your class")

    student_result = await db.execute(select(User).where(User.email == payload.student_email))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="No user found with that email")

    enrollment = ClassEnrollment(class_id=class_id, student_id=student.id)
    db.add(enrollment)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Student is already enrolled in this class")
    await db.refresh(enrollment)
    return enrollment


@router.delete("/{class_id}/enroll/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unenroll_student(
    class_id: uuid.UUID,
    student_id: uuid.UUID,
    current_user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    class_result = await db.execute(select(Class).where(Class.id == class_id))
    target_class = class_result.scalar_one_or_none()
    if not target_class:
        raise HTTPException(status_code=404, detail="Class not found")
    if target_class.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your class")

    enrollment_result = await db.execute(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.student_id == student_id,
        )
    )
    enrollment = enrollment_result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    await db.delete(enrollment)
    await db.commit()


@router.get("/{class_id}/students")
async def list_class_students(
    class_id: uuid.UUID,
    current_user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    class_result = await db.execute(select(Class).where(Class.id == class_id))
    target_class = class_result.scalar_one_or_none()
    if not target_class:
        raise HTTPException(status_code=404, detail="Class not found")
    if target_class.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your class")

    result = await db.execute(
        select(User, ClassEnrollment.enrolled_at)
        .join(ClassEnrollment, ClassEnrollment.student_id == User.id)
        .where(ClassEnrollment.class_id == class_id)
    )
    return [
        {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "enrolled_at": enrolled_at,
        }
        for student, enrolled_at in result.all()
    ]


@router.get("/{class_id}/projects")
async def list_class_projects(
    class_id: uuid.UUID,
    current_user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    class_result = await db.execute(select(Class).where(Class.id == class_id))
    target_class = class_result.scalar_one_or_none()
    if not target_class:
        raise HTTPException(status_code=404, detail="Class not found")
    if target_class.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your class")

    result = await db.execute(
        select(Project, User.name, User.email)
        .join(User, User.id == Project.owner_id)
        .where(Project.class_id == class_id)
    )
    return [
        {
            "id": project.id,
            "title": project.title,
            "owner_name": owner_name,
            "owner_email": owner_email,
            "is_published": project.is_published,
            "updated_at": project.updated_at,
        }
        for project, owner_name, owner_email in result.all()
    ]