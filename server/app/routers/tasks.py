from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..database import get_session
from ..dependencies import get_current_user
from ..models import Task, User
from ..schemas import MessageResponse, TaskCreate, TaskListResponse, TaskRead, TaskResponse, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def to_task_read(task: Task) -> TaskRead:
    return TaskRead(
        id=task.id,
        user_id=task.user_id,
        title=task.title,
        description=task.description,
        category=task.category,
        status=task.status,
        due_date=task.due_date,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def get_owned_task(task_id: int, user_id: int, session: Session) -> Task:
    task = session.exec(select(Task).where(Task.id == task_id, Task.user_id == user_id)).first()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.get("", response_model=TaskListResponse)
def list_tasks(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    status_filter: Optional[str] = Query(default=None, alias="status"),
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    statement = select(Task).where(Task.user_id == current_user.id)

    if status_filter:
        statement = statement.where(Task.status == status_filter)
    if category:
        statement = statement.where(Task.category == category)
    if search:
        statement = statement.where(Task.title.contains(search))

    tasks = session.exec(statement.order_by(Task.created_at.desc())).all()
    return TaskListResponse(tasks=[to_task_read(task) for task in tasks])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    task = Task(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        status=payload.status,
        due_date=payload.due_date,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return TaskResponse(task=to_task_read(task))


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    task = get_owned_task(task_id, current_user.id, session)
    return TaskResponse(task=to_task_read(task))


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    task = get_owned_task(task_id, current_user.id, session)
    task.title = payload.title
    task.description = payload.description
    task.category = payload.category
    task.status = payload.status
    task.due_date = payload.due_date
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)
    return TaskResponse(task=to_task_read(task))


@router.delete("/{task_id}", response_model=MessageResponse)
def delete_task(
    task_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    task = get_owned_task(task_id, current_user.id, session)
    session.delete(task)
    session.commit()
    return MessageResponse(message="Task deleted successfully")
