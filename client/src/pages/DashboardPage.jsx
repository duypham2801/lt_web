import { useEffect, useState } from "react";
import { apiRequest } from "../api/http.js";
import TaskForm, { categories, statuses } from "../components/TaskForm.jsx";
import TaskList from "../components/TaskList.jsx";

const emptyTask = { title: "", description: "", category: "study", status: "todo", dueDate: "" };
const defaultPagination = { total: 0, page: 1, pageSize: 6, totalPages: 1 };
const defaultStats = { total: 0, todo: 0, doing: 0, done: 0, unfinished: 0, overdue: 0, dueSoon: 0, deleted: 0, byCategory: {} };
const dueFilters = [
  { value: "overdue", label: "Quá hạn" },
  { value: "today", label: "Hôm nay" },
  { value: "next3", label: "3 ngày tới" },
  { value: "next7", label: "7 ngày tới" },
  { value: "none", label: "Chưa có hạn" },
];

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function priorityLevel(task) {
  if (task.status === "done") return { label: "Đã hoàn thành", className: "done", rank: 4 };
  if (!task.dueDate) return { label: "Chưa có hạn", className: "normal", rank: 3 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((dueDate - today) / 86400000);

  if (daysLeft < 0) return { label: `Quá hạn ${Math.abs(daysLeft)} ngày`, className: "critical", rank: 0 };
  if (daysLeft === 0) return { label: "Hạn hôm nay", className: "critical", rank: 0 };
  if (daysLeft <= 3) return { label: `Cao - còn ${daysLeft} ngày`, className: "high", rank: 1 };
  if (daysLeft <= 7) return { label: `Trung bình - còn ${daysLeft} ngày`, className: "medium", rank: 2 };
  return { label: `Thấp - còn ${daysLeft} ngày`, className: "normal", rank: 3 };
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [statsTasks, setStatsTasks] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [filters, setFilters] = useState({ status: "", category: "", search: "", due: "" });
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState(defaultPagination);
  const [deletedPagination, setDeletedPagination] = useState(defaultPagination);
  const [activeTab, setActiveTab] = useState("tasks");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [deleteTask, setDeleteTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [ollamaKey, setOllamaKey] = useState(() => localStorage.getItem("ollamaApiKey") || "");
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(() => localStorage.getItem("autoAiSuggest") === "true");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadTasks(1);
  }, [filters.status, filters.category, filters.due]);

  useEffect(() => {
    if (!autoSuggestEnabled || !ollamaKey.trim() || form.title.trim().length < 3) return;

    const timeoutId = window.setTimeout(() => {
      requestAiSuggestion(form.title.trim());
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [autoSuggestEnabled, ollamaKey, form.title]);

  useEffect(() => {
    if (activeTab === "stats") loadStats();
    if (activeTab === "deleted") loadDeletedTasks(1);
  }, [activeTab]);

  function showToast(message, type = "success") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2800);
  }

  async function loadTasks(page = pagination.page, pageSize = pagination.pageSize, nextFilters = filters) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (nextFilters.status) params.set("status", nextFilters.status);
    if (nextFilters.category) params.set("category", nextFilters.category);
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.due) params.set("due", nextFilters.due);

    try {
      const data = await apiRequest(`/api/tasks?${params.toString()}`);
      setTasks(data.tasks);
      setPagination({ total: data.total, page: data.page, pageSize: data.pageSize, totalPages: data.totalPages });
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadDeletedTasks(page = deletedPagination.page, pageSize = deletedPagination.pageSize) {
    setDeletedLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      const data = await apiRequest(`/api/tasks/deleted?${params.toString()}`);
      setDeletedTasks(data.tasks);
      setDeletedPagination({ total: data.total, page: data.page, pageSize: data.pageSize, totalPages: data.totalPages });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeletedLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const taskData = await apiRequest("/api/tasks?page=1&pageSize=50");
      setStatsTasks(taskData.tasks);

      try {
        setStats(await apiRequest("/api/tasks/stats"));
      } catch {
        setStats(buildStatsFromTasks(taskData.tasks));
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setStatsLoading(false);
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
      setShowCreateModal(false);
      showToast("Đã thêm công việc mới.");
      await loadTasks(1);
      if (activeTab === "stats") await loadStats();
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTask) return;

    try {
      await apiRequest(`/api/tasks/${deleteTask.id}`, { method: "DELETE" });
      setDeleteTask(null);
      showToast("Đã chuyển công việc vào thùng rác.");
      const nextPage = tasks.length === 1 ? Math.max(pagination.page - 1, 1) : pagination.page;
      await loadTasks(nextPage);
      if (activeTab === "stats") await loadStats();
    } catch (err) {
      setDeleteTask(null);
      setError(err.message);
      showToast(err.message, "error");
    }
  }

  async function handleRestore(task) {
    try {
      await apiRequest(`/api/tasks/${task.id}/restore`, { method: "POST" });
      showToast("Đã khôi phục công việc.");
      const nextPage = deletedTasks.length === 1 ? Math.max(deletedPagination.page - 1, 1) : deletedPagination.page;
      await loadDeletedTasks(nextPage);
      await loadTasks(1);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  function openEditModal(task) {
    setEditTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      category: task.category,
      status: task.status,
      dueDate: formatDate(task.dueDate),
    });
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editTask || !editForm) return;
    if (editForm.title.trim().length < 3) {
      setError("Tên công việc cần ít nhất 3 ký tự.");
      return;
    }

    try {
      const data = await apiRequest(`/api/tasks/${editTask.id}`, { method: "PUT", body: JSON.stringify(editForm) });
      setTasks((current) => current.map((task) => task.id === editTask.id ? data.task : task));
      setDetailTask((current) => current?.id === editTask.id ? data.task : current);
      setEditTask(null);
      setEditForm(null);
      showToast("Đã cập nhật công việc.");
      await loadTasks(pagination.page);
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  }

  async function requestAiSuggestion(title) {
    setAiLoading(true);
    try {
      const suggestion = await apiRequest("/api/tasks/ai/suggest", {
        method: "POST",
        headers: { "X-Ollama-Api-Key": ollamaKey.trim() },
        body: JSON.stringify({ title }),
      });
      setForm((current) => current.title.trim() === title ? { ...current, description: suggestion.description, category: suggestion.category, dueDate: formatDate(suggestion.dueDate) } : current);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSearch() {
    const nextFilters = { ...filters, search: searchInput.trim() };
    setFilters(nextFilters);
    loadTasks(1, pagination.pageSize, nextFilters);
  }

  function handleSearchKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  }

  function handleClearFilters() {
    setSearchInput("");
    setFilters({ status: "", category: "", search: "", due: "" });
  }

  function handlePageSizeChange(event) {
    loadTasks(1, Number(event.target.value));
  }

  function handleDeletedPageSizeChange(event) {
    loadDeletedTasks(1, Number(event.target.value));
  }

  return (
    <section>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="section-head dashboard-title">
        <div>
          <h1>Danh sách công việc theo mức độ</h1>
          <span>Ưu tiên theo hạn hoàn thành, trạng thái và mức độ cần xử lý.</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Thêm công việc</button>
      </div>

      <div className="tabs">
        <button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}>Công việc</button>
        <button className={activeTab === "stats" ? "active" : ""} onClick={() => setActiveTab("stats")}>Thống kê</button>
        <button className={activeTab === "deleted" ? "active" : ""} onClick={() => setActiveTab("deleted")}>Đã xóa</button>
      </div>

      {activeTab === "tasks" && (
        <div className="workspace-layout">
          <aside className="card filters sidebar-filter">
            <h2>Bộ lọc</h2>
            <label>Tìm kiếm<input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Nhập tên công việc" /></label>
            <label>Trạng thái<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Tất cả</option>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Danh mục<select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">Tất cả</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Hạn hoàn thành<select value={filters.due} onChange={(e) => setFilters({ ...filters, due: e.target.value })}><option value="">Tất cả</option>{dueFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <div className="filter-actions">
              <button className="btn btn-primary" onClick={handleSearch}>Áp dụng</button>
              <button className="btn btn-ghost" onClick={handleClearFilters}>Clear filter</button>
            </div>
          </aside>

          <div className="task-priority-panel">
            <div className="task-count">{pagination.total} công việc</div>
            {loading ? <div className="page-state">Đang tải công việc...</div> : <PriorityTaskList tasks={tasks} onDelete={setDeleteTask} onDetail={setDetailTask} onEdit={openEditModal} />}

            <div className="pagination">
              <button className="btn btn-ghost" onClick={() => loadTasks(pagination.page - 1)} disabled={pagination.page <= 1}>Trước</button>
              <span>Trang {pagination.page} / {pagination.totalPages}</span>
              <button className="btn btn-ghost" onClick={() => loadTasks(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>Sau</button>
              <label>
                Mỗi trang
                <select value={pagination.pageSize} onChange={handlePageSizeChange}>
                  <option value="6">6</option>
                  <option value="9">9</option>
                  <option value="12">12</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === "stats" && (
        <div className="card stats-panel">
          <div className="section-head inline">
            <div>
              <h2>Thống kê công việc</h2>
              <span>Lịch theo hạn hoàn thành và biểu đồ số lượng task theo trạng thái.</span>
            </div>
            <button className="btn btn-ghost" onClick={loadStats}>Tải lại</button>
          </div>
          {statsLoading ? <div className="page-state">Đang tải thống kê...</div> : (
            <>
              <div className="stats-sections">
                <div className="stats-box">
                  <h3>Lịch công việc</h3>
                  <CalendarView tasks={statsTasks} onDetail={setDetailTask} />
                </div>
                <div className="stats-box">
                  <h3>Biểu đồ trạng thái</h3>
                  <ChartView stats={stats} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "deleted" && (
        <>
          <div className="section-head">
            <h2>Thùng rác</h2>
            <span>{deletedPagination.total} công việc đã xóa mềm</span>
          </div>
          {deletedLoading ? <div className="page-state">Đang tải thùng rác...</div> : <TaskList tasks={deletedTasks} onRestore={handleRestore} deletedMode emptyMessage="Chưa có công việc đã xóa." />}
          <div className="pagination">
            <button className="btn btn-ghost" onClick={() => loadDeletedTasks(deletedPagination.page - 1)} disabled={deletedPagination.page <= 1}>Trước</button>
            <span>Trang {deletedPagination.page} / {deletedPagination.totalPages}</span>
            <button className="btn btn-ghost" onClick={() => loadDeletedTasks(deletedPagination.page + 1)} disabled={deletedPagination.page >= deletedPagination.totalPages}>Sau</button>
            <label>
              Mỗi trang
              <select value={deletedPagination.pageSize} onChange={handleDeletedPageSizeChange}>
                <option value="6">6</option>
                <option value="9">9</option>
                <option value="12">12</option>
              </select>
            </label>
          </div>
        </>
      )}

      {showCreateModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="create-title">
            <div className="modal-head">
              <h3 id="create-title">Thêm công việc mới</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Đóng</button>
            </div>
            <TaskForm value={form} onChange={setForm} onSubmit={handleCreate} submitLabel="Thêm công việc" error={error} aiLoading={aiLoading} />
          </div>
        </div>
      )}

      {detailTask && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="modal-head">
              <h3 id="detail-title">Chi tiết công việc</h3>
              <button className="btn btn-ghost" onClick={() => setDetailTask(null)}>Đóng</button>
            </div>
            <div className="task-head">
              <h1>{detailTask.title}</h1>
              <span className={`status ${detailTask.status}`}>{statuses.find((item) => item.value === detailTask.status)?.label || detailTask.status}</span>
            </div>
            <p className="detail-description">{detailTask.description || "Không có mô tả."}</p>
            <dl className="detail-list">
              <div><dt>Danh mục</dt><dd>{categories.find((item) => item.value === detailTask.category)?.label || detailTask.category}</dd></div>
              <div><dt>Hạn hoàn thành</dt><dd>{detailTask.dueDate ? new Date(detailTask.dueDate).toLocaleDateString("vi-VN") : "Chưa có hạn"}</dd></div>
              <div><dt>Ngày tạo</dt><dd>{new Date(detailTask.createdAt).toLocaleString("vi-VN")}</dd></div>
              <div><dt>Cập nhật</dt><dd>{new Date(detailTask.updatedAt).toLocaleString("vi-VN")}</dd></div>
            </dl>
            <div className="actions modal-actions">
              <button className="btn btn-primary" onClick={() => openEditModal(detailTask)}>Sửa</button>
              <button className="btn btn-danger" onClick={() => { setDeleteTask(detailTask); setDetailTask(null); }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {editTask && editForm && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="edit-title">
            <div className="modal-head">
              <h3 id="edit-title">Sửa công việc</h3>
              <button className="btn btn-ghost" onClick={() => { setEditTask(null); setEditForm(null); }}>Đóng</button>
            </div>
            <TaskForm value={editForm} onChange={setEditForm} onSubmit={handleEditSubmit} submitLabel="Lưu thay đổi" error={error} />
          </div>
        </div>
      )}

      {deleteTask && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h3 id="delete-title">Xóa công việc?</h3>
            <p>“{deleteTask.title}” sẽ được chuyển vào thùng rác và có thể khôi phục sau.</p>
            <div className="actions modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteTask(null)}>Hủy</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>Xóa mềm</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PriorityTaskList({ tasks, onDelete, onDetail, onEdit }) {
  if (tasks.length === 0) {
    return <div className="card empty">Chưa có công việc phù hợp.</div>;
  }

  return (
    <div className="priority-list">
      {tasks.map((task) => <PriorityTaskRow key={task.id} task={task} onDelete={onDelete} onDetail={onDetail} onEdit={onEdit} />)}
    </div>
  );
}

function PriorityTaskRow({ task, onDelete, onDetail, onEdit }) {
  const priority = priorityLevel(task);
  const categoryLabel = categories.find((item) => item.value === task.category)?.label || task.category;
  const statusLabel = statuses.find((item) => item.value === task.status)?.label || task.status;

  return (
    <article className={`priority-row ${priority.className}`}>
      <div className="priority-rank">Mức {priority.rank + 1}</div>
      <div className="priority-main">
        <div className="priority-head">
          <h3>{task.title}</h3>
          <span className={`priority-pill ${priority.className}`}>{priority.label}</span>
        </div>
        <p>{task.description || "Chưa có mô tả chi tiết."}</p>
        <div className="priority-meta">
          <span>Trạng thái: {statusLabel}</span>
          <span>Danh mục: {categoryLabel}</span>
          <span>Hạn: {task.dueDate ? new Date(task.dueDate).toLocaleDateString("vi-VN") : "Chưa có hạn"}</span>
        </div>
      </div>
      <div className="actions priority-actions">
        <ActionIcon label="Chi tiết" icon="ℹ" onClick={() => onDetail(task)} />
        <ActionIcon label="Sửa" icon="✎" onClick={() => onEdit(task)} />
        <ActionIcon label="Xóa" icon="🗑" variant="danger" onClick={() => onDelete(task)} />
      </div>
    </article>
  );
}

function ActionIcon({ label, icon, onClick, variant = "ghost" }) {
  return (
    <button className={`icon-btn ${variant}`} onClick={onClick} aria-label={label} data-tooltip={label}>
      {icon}
    </button>
  );
}

function buildStatsFromTasks(tasks) {
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 3);
  const activeTasks = tasks.filter((task) => !task.deletedAt);
  const unfinishedTasks = activeTasks.filter((task) => task.status !== "done");

  return {
    total: activeTasks.length,
    todo: activeTasks.filter((task) => task.status === "todo").length,
    doing: activeTasks.filter((task) => task.status === "doing").length,
    done: activeTasks.filter((task) => task.status === "done").length,
    unfinished: unfinishedTasks.length,
    overdue: unfinishedTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now).length,
    dueSoon: unfinishedTasks.filter((task) => task.dueDate && new Date(task.dueDate) >= now && new Date(task.dueDate) <= soon).length,
    deleted: 0,
    byCategory: categories.reduce((result, item) => ({ ...result, [item.value]: activeTasks.filter((task) => task.category === item.value).length }), {}),
  };
}

function CalendarView({ tasks, onDetail }) {
  const datedTasks = tasks.filter((task) => task.dueDate);
  const dates = datedTasks.map((task) => new Date(task.dueDate));
  const initialDate = dates.length ? new Date(Math.min(...dates)) : new Date();
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const years = Array.from({ length: 7 }, (_, index) => selectedYear - 3 + index);

  function changeMonth(offset) {
    const nextDate = new Date(selectedYear, selectedMonth + offset, 1);
    setSelectedMonth(nextDate.getMonth());
    setSelectedYear(nextDate.getFullYear());
  }

  return (
    <div className="calendar-board">
      <div className="calendar-toolbar">
        <button className="btn btn-ghost" onClick={() => changeMonth(-1)}>Tháng trước</button>
        <h4>{monthName}</h4>
        <button className="btn btn-ghost" onClick={() => changeMonth(1)}>Tháng sau</button>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} aria-label="Chọn tháng">
          {Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>Tháng {index + 1}</option>)}
        </select>
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} aria-label="Chọn năm">
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
      <div className="calendar-weekdays">{["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {calendarDays.map((day, index) => {
          const dayTasks = day ? datedTasks.filter((task) => {
            const dueDate = new Date(task.dueDate);
            return dueDate.getFullYear() === selectedYear && dueDate.getMonth() === selectedMonth && dueDate.getDate() === day;
          }) : [];

          return (
            <div key={`${day || "blank"}-${index}`} className={`calendar-day ${dayTasks.length ? "has-task" : ""}`}>
              {day && <strong>{day}</strong>}
              {dayTasks.slice(0, 2).map((task) => (
                <button key={task.id} className={`calendar-task ${task.status}`} onClick={() => onDetail(task)}>{task.title}</button>
              ))}
              {dayTasks.length > 2 && <em>+{dayTasks.length - 2} task</em>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartView({ stats }) {
  const items = [
    { label: "Chưa làm", value: stats.todo },
    { label: "Đang làm", value: stats.doing },
    { label: "Hoàn thành", value: stats.done },
    { label: "Quá hạn", value: stats.overdue },
    { label: "Đã xóa", value: stats.deleted },
  ];
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="column-chart">
      {items.map((item) => (
        <div key={item.label} className="chart-column">
          <strong>{item.value}</strong>
          <div className="chart-column-track"><div style={{ height: `${(item.value / maxValue) * 100}%` }} /></div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, danger = false }) {
  return (
    <div className={`stat-card ${danger ? "danger" : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
