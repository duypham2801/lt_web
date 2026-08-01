from sqlmodel import Session, select

from app.auth import hash_password
from app.database import create_db_and_tables, engine
from app.models import Task, User


def main() -> None:
    create_db_and_tables()
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "demo@example.com")).first()
        if user is None:
            user = User(name="Demo User", email="demo@example.com", password_hash=hash_password("123456"))
            session.add(user)
            session.commit()
            session.refresh(user)

        existing_tasks = session.exec(select(Task).where(Task.user_id == user.id)).all()
        if existing_tasks:
            print("Demo data already exists")
            return

        tasks = [
            Task(user_id=user.id, title="Ôn tập React", description="Ôn component, state, props và useEffect.", category="study", status="todo"),
            Task(user_id=user.id, title="Làm báo cáo cuối kỳ", description="Hoàn thiện báo cáo và ảnh giao diện.", category="work", status="doing"),
            Task(user_id=user.id, title="Chuẩn bị vấn đáp", description="Ôn JWT, CRUD, REST API và userId isolation.", category="study", status="done"),
        ]
        session.add_all(tasks)
        session.commit()
        print("Demo data created")


if __name__ == "__main__":
    main()
