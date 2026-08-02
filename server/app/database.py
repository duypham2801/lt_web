from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine

from .config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def ensure_task_deleted_at_column() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.connect() as connection:
        columns = connection.execute(text("PRAGMA table_info(task)")).fetchall()
        if columns and "deleted_at" not in {column[1] for column in columns}:
            connection.execute(text("ALTER TABLE task ADD COLUMN deleted_at DATETIME"))
            connection.commit()


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    ensure_task_deleted_at_column()


def get_session():
    with Session(engine) as session:
        yield session
