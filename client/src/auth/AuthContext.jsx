import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/http.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    apiRequest("/api/auth/me")
      .then((data) => {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  async function register(name, email, password) {
    const data = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
