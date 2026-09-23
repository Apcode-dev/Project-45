import { useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
  permissions: string[];
  avatar?: string | null;
}

// Module-level reactive singleton store
let globalUser: User | null = (() => {
  try {
    const stored = localStorage.getItem("mis_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
})();

let globalToken: string | null = (() => {
  try {
    return localStorage.getItem("mis_token");
  } catch {
    return null;
  }
})();

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("Auth listener error:", e);
    }
  });
}

export function performLogin(newUser: User, newToken: string) {
  globalUser = newUser;
  globalToken = newToken;
  try {
    localStorage.setItem("mis_user", JSON.stringify(newUser));
    localStorage.setItem("mis_token", newToken);
  } catch (e) {
    console.error("Failed to save auth to localStorage:", e);
  }
  notifyListeners();
  window.dispatchEvent(new Event("auth-login"));
}

export function performUpdateUser(updatedFields: Partial<User>) {
  if (!globalUser) return;
  globalUser = { ...globalUser, ...updatedFields };
  try {
    localStorage.setItem("mis_user", JSON.stringify(globalUser));
  } catch (e) {
    console.error("Failed to save updated user to localStorage:", e);
  }
  notifyListeners();
  window.dispatchEvent(new Event("auth-update"));
}

export function performLogout() {
  globalUser = null;
  globalToken = null;
  try {
    localStorage.removeItem("mis_user");
    localStorage.removeItem("mis_token");
  } catch (e) {
    console.error("Failed to clear auth from localStorage:", e);
  }
  notifyListeners();
  window.dispatchEvent(new Event("auth-logout"));
}

export function useAuth() {
  const [, setRenderTrigger] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setRenderTrigger((prev) => prev + 1);
    };

    listeners.add(handleUpdate);
    window.addEventListener("auth-logout", handleUpdate);
    window.addEventListener("auth-login", handleUpdate);
    window.addEventListener("auth-update", handleUpdate);

    return () => {
      listeners.delete(handleUpdate);
      window.removeEventListener("auth-logout", handleUpdate);
      window.removeEventListener("auth-login", handleUpdate);
      window.removeEventListener("auth-update", handleUpdate);
    };
  }, []);

  return {
    user: globalUser,
    token: globalToken,
    isAuthenticated: !!globalToken && !!globalUser,
    login: performLogin,
    updateUser: performUpdateUser,
    logout: performLogout,
  };
}

