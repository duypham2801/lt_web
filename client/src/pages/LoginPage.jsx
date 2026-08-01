import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }

    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Đăng nhập</h1>
        <p>Truy cập danh sách công việc cá nhân của bạn.</p>
        {error && <div className="alert error">{error}</div>}
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Mật khẩu<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn btn-primary" type="submit">Đăng nhập</button>
        <span>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></span>
      </form>
    </section>
  );
}
