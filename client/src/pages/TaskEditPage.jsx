import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/http.js";
import TaskForm from "../components/TaskForm.jsx";

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default function TaskEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/api/tasks/${id}`)
      .then((data) => setForm({
        title: data.task.title,
        description: data.task.description || "",
        category: data.task.category,
        status: data.task.status,
        dueDate: formatDate(data.task.dueDate),
      }))
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.title.trim().length < 3) {
      setError("Tên công việc cần ít nhất 3 ký tự.");
      return;
    }

    try {
      await apiRequest(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(form) });
      navigate(`/tasks/${id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!form && !error) return <div className="page-state">Đang tải form sửa...</div>;

  return (
    <section>
      <div className="section-head">
        <h1>Sửa công việc</h1>
        <Link className="btn btn-ghost" to={`/tasks/${id}`}>Quay lại</Link>
      </div>
      {form ? <TaskForm value={form} onChange={setForm} onSubmit={handleSubmit} submitLabel="Lưu thay đổi" error={error} /> : <div className="card alert error">{error}</div>}
    </section>
  );
}
