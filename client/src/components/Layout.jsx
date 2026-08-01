import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <header className="navbar">
        <div className="container nav-inner">
          <Link to="/" className="logo">Task<span>Manager</span></Link>
          <nav className="nav-actions">
            {user ? (
              <>
                <span className="user-chip">{user.name}</span>
                <button className="btn btn-ghost" onClick={handleLogout}>Đăng xuất</button>
              </>
            ) : (
              <>
                <Link className="btn btn-ghost" to="/login">Đăng nhập</Link>
                <Link className="btn btn-primary" to="/register">Đăng ký</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container main"><Outlet /></main>
    </>
  );
}
