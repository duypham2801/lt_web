import TaskCard from "./TaskCard.jsx";

export default function TaskList({ tasks, onDelete, onRestore, onDetail, onEdit, deletedMode = false, emptyMessage = "Chưa có công việc phù hợp." }) {
  if (tasks.length === 0) {
    return <div className="card empty">{emptyMessage}</div>;
  }

  return (
    <div className="task-grid">
      {tasks.map((task) => <TaskCard key={task.id} task={task} onDelete={onDelete} onRestore={onRestore} onDetail={onDetail} onEdit={onEdit} deletedMode={deletedMode} />)}
    </div>
  );
}
