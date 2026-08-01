import { useEffect, useState } from "react";
import { apiRequest } from "../api/http.js";
import TaskForm, { categories, statuses } from "../components/TaskForm.jsx";
import TaskList from "../components/TaskList.jsx";

const emptyTask = { title: "", description: "", category: "study", status: "todo", dueDate: "" };

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [filters, setFilters] = useState({ status: "", category: "", search: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [filters.status, filters.category]);

  async function loadTasks() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.category) params.set("category", filters.category);
    if (filters.search) params.set("search", filters.search);

    try {
      const data = await apiRequest(`/api/tasks?${params.toString()}`);
      setTasks(data.tasks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");

    if (form.title.trim().length < 3) {
      setError("Tên công việc cần ít nhất 3 ký tự.");
      return;
    }

    try {
      await apiRequest("/api/tasks", { method: "POST", body: JSON.stringify(form) });
      setForm(emptyTask);
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Bạn chắc chắn muốn xóa công việc này?")) return;

    try {
      await apiRequest(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((current) => current.filter((task) => task.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="hero">
        <h1>Quản lý công việc cá nhân</h1>
        <p>CRUD task, lọc theo trạng thái/danh mục và bảo vệ dữ liệu theo userId.</p>
      </div>

      <div className="dashboard-grid">
        <TaskForm value={form} onChange={setForm} onSubmit={handleCreate} submitLabel="Thêm công việc" error={error} />

        <div className="card filters">
          <h2>Bộ lọc</h2>
          <label>Tìm kiếm<input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Nhập tên công việc" /></label>
          <div className="form-row">
            <label>Trạng thái<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Tất cả</option>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Danh mục<select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">Tất cả</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
          <button className="btn btn-ghost" onClick={loadTasks}>Áp dụng tìm kiếm</button>
        </div>
      </div>

      <div className="section-head">
        <h2>Danh sách công việc</h2>
        <span>{tasks.length} công việc</span>
      </div>
      {loading ? <div className="page-state">Đang tải công việc...</div> : <TaskList tasks={tasks} onDelete={handleDelete} />}
    </section>
  );
}
