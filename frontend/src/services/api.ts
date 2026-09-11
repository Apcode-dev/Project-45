import axios from "axios";

export const API_BASE_URL = "http://localhost:5001/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mis_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("mis_token");
      localStorage.removeItem("mis_user");
      if (window.location.pathname !== "/login") {
        window.dispatchEvent(new Event("auth-logout"));
      }
    }
    return Promise.reject(error);
  }
);
