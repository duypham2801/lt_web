import { Link } from "react-router-dom";
import { categories, statuses } from "./TaskForm.jsx";

function labelOf(items, value) {
  return items.find((item) => item.value === value)?.label || value;
}

export default function TaskCard({ task, onDelete }) {
  return (
    <article className="task-card">
      <div className="task-head">
        <h3>{task.title}</h3>
        <span className={`status ${task.status}`}>{labelOf(statuses, task.status)}</span>
      </div>
      <p>{task.description || "Không có mô tả."}</p>
      <div className="meta">
        <span>{labelOf(categories, task.category)}</span>
        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("vi-VN") : "Chưa có hạn"}</span>
      </div>
      <div className="actions">
        <Link className="btn btn-ghost" to={`/tasks/${task.id}`}>Chi tiết</Link>
        <Link className="btn btn-ghost" to={`/tasks/${task.id}/edit`}>Sửa</Link>
        <button className="btn btn-danger" onClick={() => onDelete(task.id)}>Xóa</button>
      </div>
    </article>
  );
}
