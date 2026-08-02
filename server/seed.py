from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.auth import hash_password
from app.database import create_db_and_tables, engine
from app.models import Task, User


def due_in(days: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


def create_user_with_tasks(session: Session, name: str, email: str, password: str, tasks: list[Task]) -> bool:
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None:
        user = User(name=name, email=email, password_hash=hash_password(password))
        session.add(user)
        session.commit()
        session.refresh(user)

    existing_tasks = {task.title: task for task in session.exec(select(Task).where(Task.user_id == user.id)).all()}
    changed = False

    for task in tasks:
        existing_task = existing_tasks.get(task.title)
        if existing_task is None:
            task.user_id = user.id
            session.add(task)
            changed = True
        elif existing_task.due_date is None:
            existing_task.due_date = task.due_date
            session.add(existing_task)
            changed = True

    if changed:
        session.commit()
    return changed


def backfill_missing_deadlines(session: Session) -> bool:
    tasks = session.exec(select(Task).where(Task.due_date == None)).all()
    for index, task in enumerate(tasks, start=1):
        task.due_date = due_in(index)
        session.add(task)
    if tasks:
        session.commit()
    return bool(tasks)


def main() -> None:
    create_db_and_tables()
    with Session(engine) as session:
        backfilled_deadlines = backfill_missing_deadlines(session)
        created_demo = create_user_with_tasks(
            session,
            "Demo User",
            "demo@example.com",
            "123456",
            [
                Task(user_id=0, title="Ôn tập React", description="Ôn component, state, props và useEffect.", category="study", status="todo", due_date=due_in(1)),
                Task(user_id=0, title="Làm báo cáo cuối kỳ", description="Hoàn thiện báo cáo và ảnh giao diện.", category="work", status="doing", due_date=due_in(2)),
                Task(user_id=0, title="Chuẩn bị vấn đáp", description="Ôn JWT, CRUD, REST API và userId isolation.", category="study", status="done", due_date=due_in(-2)),
                Task(user_id=0, title="Thiết kế giao diện dashboard", description="Bố cục form, bộ lọc, danh sách và trạng thái công việc.", category="work", status="done", due_date=due_in(-1)),
                Task(user_id=0, title="Kiểm thử API task", description="Gọi thử các endpoint tạo, đọc, sửa, xóa bằng tài khoản demo.", category="study", status="doing", due_date=due_in(0)),
                Task(user_id=0, title="Dọn dẹp bàn học", description="Sắp xếp tài liệu trước khi ôn thi cuối kỳ.", category="personal", status="todo", due_date=due_in(4)),
                Task(user_id=0, title="Viết phần kiến trúc", description="Mô tả React, FastAPI, JWT và cơ sở dữ liệu trong báo cáo.", category="work", status="todo", due_date=due_in(3)),
                Task(user_id=0, title="Rà soát phân quyền userId", description="Đảm bảo mỗi user chỉ xem được task của chính mình.", category="study", status="done", due_date=due_in(-3)),
                Task(user_id=0, title="Chuẩn bị slide demo", description="Tạo kịch bản đăng nhập, lọc, phân trang và xóa công việc.", category="work", status="doing", due_date=due_in(1)),
                Task(user_id=0, title="Mua đồ dùng cá nhân", description="Ví dụ công việc cá nhân để kiểm tra bộ lọc danh mục.", category="personal", status="todo", due_date=due_in(6)),
                Task(user_id=0, title="Đọc lại lý thuyết REST", description="Ôn status code, method HTTP và cấu trúc response JSON.", category="study", status="todo", due_date=due_in(2)),
                Task(user_id=0, title="Ghi chú câu hỏi vấn đáp", description="Tổng hợp câu hỏi thường gặp và câu trả lời ngắn gọn.", category="other", status="doing", due_date=due_in(5)),
                Task(user_id=0, title="Hoàn thiện README", description="Cập nhật hướng dẫn chạy Docker, backend và frontend.", category="work", status="done", due_date=due_in(-4)),
                Task(user_id=0, title="Kiểm tra responsive", description="Mở giao diện trên màn hình nhỏ để kiểm tra layout.", category="other", status="todo", due_date=due_in(7)),
                Task(user_id=0, title="Nộp bài cuối kỳ", description="Kiểm tra file PDF, source code và thông tin sinh viên trước khi nộp.", category="study", status="todo", due_date=due_in(8)),
                Task(user_id=0, title="Cập nhật mock data", description="Thêm dữ liệu mẫu để demo phân trang và bộ lọc rõ ràng hơn.", category="work", status="doing", due_date=due_in(3)),
                Task(user_id=0, title="Kiểm tra chức năng tìm kiếm", description="Nhập keyword, nhấn Enter và xác nhận danh sách được lọc đúng.", category="study", status="todo", due_date=due_in(4)),
                Task(user_id=0, title="Sao lưu source code", description="Nén thư mục dự án và lưu bản dự phòng trước khi nộp bài.", category="work", status="done", due_date=due_in(-5)),
                Task(user_id=0, title="Tập thể dục buổi sáng", description="Ví dụ task cá nhân để kiểm tra trạng thái đang làm.", category="personal", status="doing", due_date=due_in(9)),
                Task(user_id=0, title="Đọc tài liệu FastAPI", description="Ôn dependency injection, router và response model.", category="study", status="todo", due_date=due_in(10)),
            ],
        )
        created_second = create_user_with_tasks(
            session,
            "Second User",
            "second@example.com",
            "123456",
            [
                Task(user_id=0, title="Mua đồ cá nhân", description="Ví dụ task riêng của tài khoản thứ hai.", category="personal", status="todo", due_date=due_in(2)),
                Task(user_id=0, title="Theo dõi công việc nhóm", description="Dữ liệu này không hiển thị trong tài khoản demo@example.com.", category="work", status="doing", due_date=due_in(5)),
            ],
        )
        if created_demo or created_second or backfilled_deadlines:
            print("Demo data created or updated")
        else:
            print("Demo data already exists")


if __name__ == "__main__":
    main()
