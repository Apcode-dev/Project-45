import { useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
  permissions: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("mis_user");
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("mis_token");
  });

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener("auth-logout", handleLogout);
    return () => window.removeEventListener("auth-logout", handleLogout);
  }, []);

  const login = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("mis_user", JSON.stringify(newUser));
    localStorage.setItem("mis_token", newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("mis_user");
    localStorage.removeItem("mis_token");
  };

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  };
}
