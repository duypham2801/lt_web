import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Vui lòng nhập đầy đủ họ tên, email và mật khẩu.");
      return;
    }

    if (form.password.length < 6) {
      setError("Mật khẩu cần ít nhất 6 ký tự.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    try {
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Đăng ký</h1>
        <p>Tạo tài khoản để quản lý công việc riêng theo userId.</p>
        {error && <div className="alert error">{error}</div>}
        <label>Họ tên<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Mật khẩu<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <label>Nhập lại mật khẩu<input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
        <button className="btn btn-primary" type="submit">Đăng ký</button>
        <span>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></span>
      </form>
    </section>
  );
}
