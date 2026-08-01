import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/http.js";
import { categories, statuses } from "../components/TaskForm.jsx";

function labelOf(items, value) {
  return items.find((item) => item.value === value)?.label || value;
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/api/tasks/${id}`)
      .then((data) => setTask(data.task))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="card alert error">{error}</div>;
  if (!task) return <div className="page-state">Đang tải chi tiết...</div>;

  return (
    <section className="detail-page">
      <div className="card detail-card">
        <div className="task-head">
          <h1>{task.title}</h1>
          <span className={`status ${task.status}`}>{labelOf(statuses, task.status)}</span>
        </div>
        <p className="detail-description">{task.description || "Không có mô tả."}</p>
        <dl className="detail-list">
          <div><dt>Danh mục</dt><dd>{labelOf(categories, task.category)}</dd></div>
          <div><dt>Hạn hoàn thành</dt><dd>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("vi-VN") : "Chưa có hạn"}</dd></div>
          <div><dt>Ngày tạo</dt><dd>{new Date(task.createdAt).toLocaleString("vi-VN")}</dd></div>
          <div><dt>Cập nhật</dt><dd>{new Date(task.updatedAt).toLocaleString("vi-VN")}</dd></div>
        </dl>
        <div className="actions">
          <Link className="btn btn-primary" to={`/tasks/${task.id}/edit`}>Sửa</Link>
          <Link className="btn btn-ghost" to="/">Quay lại</Link>
        </div>
      </div>
    </section>
  );
}
