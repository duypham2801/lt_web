import { useState } from "react";
import { Link } from "react-router-dom";

export default function ConfigPage() {
  const [ollamaKey, setOllamaKey] = useState(() => localStorage.getItem("ollamaApiKey") || "");
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(() => localStorage.getItem("autoAiSuggest") === "true");
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2800);
  }

  function handleSave(event) {
    event.preventDefault();
    localStorage.setItem("ollamaApiKey", ollamaKey.trim());
    localStorage.setItem("autoAiSuggest", String(autoSuggestEnabled));
    showToast("Đã lưu cấu hình AI.");
  }

  function handleClearKey() {
    localStorage.removeItem("ollamaApiKey");
    setOllamaKey("");
    showToast("Đã xóa Ollama API key.");
  }

  return (
    <section>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      <div className="section-head">
        <div>
          <h1>Cấu hình hệ thống</h1>
          <span>Thiết lập các cấu hình cần thiết cho ứng dụng.</span>
        </div>
        <Link className="btn btn-ghost" to="/">Quay lại Dashboard</Link>
      </div>

      <form className="card config-page" onSubmit={handleSave}>
        <div>
          <h2>Ollama AI</h2>
          <p>Model mặc định: <strong>gemma4:31b-cloud</strong>. API key chỉ lưu trên trình duyệt của bạn.</p>
        </div>

        <label className="toggle-row">
          <input type="checkbox" checked={autoSuggestEnabled} onChange={(event) => setAutoSuggestEnabled(event.target.checked)} />
          Bật tự động gợi ý mô tả và danh mục khi nhập tên task
        </label>

        <label>
          Ollama API key
          <input type="password" value={ollamaKey} onChange={(event) => setOllamaKey(event.target.value)} placeholder="Nhập Ollama API key" />
        </label>

        <div className="actions">
          <button className="btn btn-primary" type="submit">Lưu cấu hình</button>
          <button className="btn btn-ghost" type="button" onClick={handleClearKey}>Xóa key</button>
        </div>
      </form>
    </section>
  );
}
