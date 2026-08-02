import json
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlmodel import Session, case, func, select

from ..config import settings
from ..database import get_session
from ..dependencies import get_current_user
from ..models import Task, User
from ..schemas import (
    ALLOWED_CATEGORIES,
    AiSuggestRequest,
    AiSuggestResponse,
    MessageResponse,
    TaskCreate,
    TaskListResponse,
    TaskRead,
    TaskResponse,
    TaskStatsResponse,
    TaskUpdate,
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


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
        deleted_at=task.deleted_at,
    )


def get_owned_task(task_id: int, user_id: int, session: Session, include_deleted: bool = False) -> Task:
    filters = [Task.id == task_id, Task.user_id == user_id]
    if not include_deleted:
        filters.append(Task.deleted_at == None)

    task = session.exec(select(Task).where(*filters)).first()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def active_filters(user_id: int) -> list:
    return [Task.user_id == user_id, Task.deleted_at == None]


def parse_ai_json(raw_text: str) -> dict:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]

    return json.loads(text)


def apply_task_filters(filters: list, status_filter: Optional[str], category: Optional[str], search: Optional[str], due: Optional[str]) -> list:
    if status_filter:
        filters.append(Task.status == status_filter)
    if category:
        filters.append(Task.category == category)
    if search:
        filters.append(Task.title.contains(search))

    now = utc_now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    if due == "overdue":
        filters.extend([Task.status != "done", Task.due_date != None, Task.due_date < today_start])
    elif due == "today":
        filters.extend([Task.due_date >= today_start, Task.due_date < tomorrow_start])
    elif due == "next3":
        filters.extend([Task.status != "done", Task.due_date >= today_start, Task.due_date < today_start + timedelta(days=4)])
    elif due == "next7":
        filters.extend([Task.status != "done", Task.due_date >= today_start, Task.due_date < today_start + timedelta(days=8)])
    elif due == "none":
        filters.append(Task.due_date == None)
    return filters


@router.get("/stats", response_model=TaskStatsResponse)
def get_task_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    tasks = session.exec(select(Task).where(Task.user_id == current_user.id)).all()
    now = utc_now().replace(tzinfo=None)
    soon = now + timedelta(days=3)
    active_tasks = [task for task in tasks if task.deleted_at is None]
    unfinished_tasks = [task for task in active_tasks if task.status != "done"]

    return TaskStatsResponse(
        total=len(active_tasks),
        todo=sum(1 for task in active_tasks if task.status == "todo"),
        doing=sum(1 for task in active_tasks if task.status == "doing"),
        done=sum(1 for task in active_tasks if task.status == "done"),
        unfinished=len(unfinished_tasks),
        overdue=sum(1 for task in unfinished_tasks if task.due_date and task.due_date < now),
        due_soon=sum(1 for task in unfinished_tasks if task.due_date and now <= task.due_date <= soon),
        deleted=sum(1 for task in tasks if task.deleted_at is not None),
        by_category={category: sum(1 for task in active_tasks if task.category == category) for category in sorted(ALLOWED_CATEGORIES)},
    )


@router.post("/ai/suggest", response_model=AiSuggestResponse)
async def suggest_task_fields(
    payload: AiSuggestRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    ollama_api_key: Annotated[Optional[str], Header(alias="X-Ollama-Api-Key")] = None,
):
    if not current_user.id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if not ollama_api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ollama API key is required")

    existing_tasks = session.exec(
        select(Task)
        .where(Task.user_id == current_user.id, Task.deleted_at == None, Task.due_date != None)
        .order_by(Task.due_date.asc())
        .limit(20)
    ).all()
    schedule_context = [
        {
            "title": task.title,
            "status": task.status,
            "category": task.category,
            "dueDate": task.due_date.date().isoformat(),
        }
        for task in existing_tasks
    ]
    today = utc_now().date().isoformat()
    prompt = (
        "Bạn là trợ lý quản lý công việc. Dựa trên lịch công việc hiện có để chọn deadline hợp lý, "
        "tránh dồn quá nhiều việc cùng một ngày nếu có thể. Trả về JSON thuần với ba khóa: "
        "description là mô tả tiếng Việt 1-2 câu, category là một trong study, work, personal, other, "
        "dueDate là ngày hạn hoàn thành dạng YYYY-MM-DD và không được sớm hơn hôm nay. "
        f"Hôm nay: {today}. "
        f"Lịch hiện có: {json.dumps(schedule_context, ensure_ascii=False)}. "
        f"Tên công việc mới: {payload.title}"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                settings.ollama_api_url,
                headers={"Authorization": f"Bearer {ollama_api_key}"},
                json={"model": settings.ollama_model, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Ollama API request failed") from exc

    raw_text = data.get("response") or data.get("message", {}).get("content") or ""
    try:
        suggestion = parse_ai_json(raw_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Ollama response is invalid") from exc

    category = suggestion.get("category", "other")
    if category not in ALLOWED_CATEGORIES:
        category = "other"

    description = str(suggestion.get("description", "")).strip()
    if not description:
        description = f"Hoàn thành công việc: {payload.title}."

    due_date_text = str(suggestion.get("dueDate") or suggestion.get("due_date") or "").strip()
    try:
        due_date = datetime.fromisoformat(due_date_text)
    except ValueError:
        due_date = utc_now() + timedelta(days=3)
    if due_date.date() < utc_now().date():
        due_date = utc_now() + timedelta(days=1)

    return AiSuggestResponse(description=description[:1000], category=category, due_date=due_date)


@router.get("/deleted", response_model=TaskListResponse)
def list_deleted_tasks(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=6, ge=1, le=50),
):
    filters = [Task.user_id == current_user.id, Task.deleted_at != None]
    total = session.exec(select(func.count()).select_from(Task).where(*filters)).one()
    total_pages = max((total + pageSize - 1) // pageSize, 1)
    current_page = min(page, total_pages)
    offset = (current_page - 1) * pageSize
    statement = select(Task).where(*filters).order_by(Task.deleted_at.desc()).offset(offset).limit(pageSize)
    tasks = session.exec(statement).all()

    return TaskListResponse(
        tasks=[to_task_read(task) for task in tasks],
        total=total,
        page=current_page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


@router.get("", response_model=TaskListResponse)
def list_tasks(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    status_filter: Optional[str] = Query(default=None, alias="status"),
    category: Optional[str] = None,
    search: Optional[str] = None,
    due: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=6, ge=1, le=50),
):
    filters = apply_task_filters(active_filters(current_user.id), status_filter, category, search, due)
    total = session.exec(select(func.count()).select_from(Task).where(*filters)).one()
    total_pages = max((total + pageSize - 1) // pageSize, 1)
    current_page = min(page, total_pages)
    offset = (current_page - 1) * pageSize
    priority = case((Task.status != "done", 0), else_=1)
    due_priority = case((Task.due_date != None, 0), else_=1)
    statement = (
        select(Task)
        .where(*filters)
        .order_by(priority, due_priority, Task.due_date.asc(), Task.created_at.desc())
        .offset(offset)
        .limit(pageSize)
    )
    tasks = session.exec(statement).all()

    return TaskListResponse(
        tasks=[to_task_read(task) for task in tasks],
        total=total,
        page=current_page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


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
    task.updated_at = utc_now()
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
    task.deleted_at = utc_now()
    task.updated_at = task.deleted_at
    session.add(task)
    session.commit()
    return MessageResponse(message="Task moved to trash")


@router.post("/{task_id}/restore", response_model=TaskResponse)
def restore_task(
    task_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    task = get_owned_task(task_id, current_user.id, session, include_deleted=True)
    task.deleted_at = None
    task.updated_at = utc_now()
    session.add(task)
    session.commit()
    session.refresh(task)
    return TaskResponse(task=to_task_read(task))
