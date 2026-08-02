import { categories, statuses } from "./TaskForm.jsx";

function labelOf(items, value) {
  return items.find((item) => item.value === value)?.label || value;
}

function ActionIcon({ label, icon, onClick, variant = "ghost" }) {
  return (
    <button className={`icon-btn ${variant}`} onClick={onClick} aria-label={label} data-tooltip={label}>
      {icon}
    </button>
  );
}

function dueBadge(task) {
  if (!task.dueDate || task.status === "done" || task.deletedAt) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((dueDate - today) / 86400000);

  if (daysLeft < 0) return { label: "Quá hạn", className: "overdue" };
  if (daysLeft === 0) return { label: "Hạn hôm nay", className: "urgent" };
  if (daysLeft <= 3) return { label: `Còn ${daysLeft} ngày`, className: "soon" };
  return null;
}

export default function TaskCard({ task, onDelete, onRestore, onDetail, onEdit, deletedMode = false }) {
  const badge = dueBadge(task);

  return (
    <article className={`task-card ${task.deletedAt ? "deleted" : ""}`}>
      <div className="task-head">
        <h3>{task.title}</h3>
        <span className={`status ${task.status}`}>{labelOf(statuses, task.status)}</span>
      </div>
      {badge && <span className={`due-badge ${badge.className}`}>{badge.label}</span>}
      {task.deletedAt && <span className="due-badge deleted">Đã xóa {new Date(task.deletedAt).toLocaleDateString("vi-VN")}</span>}
      <p>{task.description || "Không có mô tả."}</p>
      <div className="meta">
        <span>{labelOf(categories, task.category)}</span>
        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("vi-VN") : "Chưa có hạn"}</span>
      </div>
      <div className="actions">
        {!deletedMode && onDetail && <ActionIcon label="Chi tiết" icon="ℹ" onClick={() => onDetail(task)} />}
        {!deletedMode && onEdit && <ActionIcon label="Sửa" icon="✎" onClick={() => onEdit(task)} />}
        {deletedMode ? <ActionIcon label="Khôi phục" icon="↺" variant="primary" onClick={() => onRestore(task)} /> : <ActionIcon label="Xóa" icon="🗑" variant="danger" onClick={() => onDelete(task)} />}
      </div>
    </article>
  );
}
