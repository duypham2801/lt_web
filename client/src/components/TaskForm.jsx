const categories = [
  { value: "study", label: "Học tập" },
  { value: "work", label: "Công việc" },
  { value: "personal", label: "Cá nhân" },
  { value: "other", label: "Khác" },
];

const statuses = [
  { value: "todo", label: "Cần làm" },
  { value: "doing", label: "Đang làm" },
  { value: "done", label: "Hoàn thành" },
];

export { categories, statuses };

export default function TaskForm({ value, onChange, onSubmit, submitLabel, error }) {
  function updateField(event) {
    onChange({ ...value, [event.target.name]: event.target.value });
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      {error && <div className="alert error">{error}</div>}
      <label>
        Tên công việc <span>*</span>
        <input name="title" value={value.title} onChange={updateField} placeholder="Ví dụ: Ôn tập React" />
      </label>
      <label>
        Mô tả
        <textarea name="description" value={value.description} onChange={updateField} rows="4" placeholder="Ghi chú chi tiết cho công việc" />
      </label>
      <div className="form-row">
        <label>
          Danh mục
          <select name="category" value={value.category} onChange={updateField}>
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>
          Trạng thái
          <select name="status" value={value.status} onChange={updateField}>
            {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>
          Hạn hoàn thành
          <input type="date" name="dueDate" value={value.dueDate} onChange={updateField} />
        </label>
      </div>
      <button className="btn btn-primary" type="submit">{submitLabel}</button>
    </form>
  );
}
