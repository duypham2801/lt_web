import TaskCard from "./TaskCard.jsx";

export default function TaskList({ tasks, onDelete }) {
  if (tasks.length === 0) {
    return <div className="card empty">Chưa có công việc phù hợp.</div>;
  }

  return (
    <div className="task-grid">
      {tasks.map((task) => <TaskCard key={task.id} task={task} onDelete={onDelete} />)}
    </div>
  );
}
