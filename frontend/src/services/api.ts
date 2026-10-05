import axios from "axios";
import { performLogout } from "../store/authStore.js";
import { showToast } from "../utils/toast.js";

export const resolveApiBaseUrl = (): string => {
  try {
    const custom = localStorage.getItem("mis_custom_api_url");
    if (custom && custom.trim()) {
      let trimmed = custom.trim().replace(/\/+$/, "");
      if (!trimmed.endsWith("/api") && trimmed.startsWith("http")) {
        trimmed = `${trimmed}/api`;
      }
      return trimmed;
    }
  } catch {}

  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) {
    let envUrl = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, "");
    if (!envUrl.endsWith("/api") && envUrl.startsWith("http")) {
      envUrl = `${envUrl}/api`;
    }
    return envUrl;
  }

  const isCapacitorNative =
    typeof window !== "undefined" &&
    (window.location.protocol === "capacitor:" ||
      window.location.protocol === "file:" ||
      (window as any).Capacitor?.isNativePlatform());

  if (isCapacitorNative) {
    return "https://quantum-appearing-keeps-jpeg.trycloudflare.com/api";
  }

  return "/api";
};

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isLoggedOutToastShown = false;

// Request Interceptor: Attach bearer token and dynamically set base URL
api.interceptors.request.use((config) => {
  try {
    config.baseURL = resolveApiBaseUrl();
    const token = localStorage.getItem("mis_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Ignore storage read errors
  }
  return config;
});

// Response Interceptor: Centralized error handler for Network Reliability & Security
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Detect No Internet / Backend Server Connection Failure
    if (!navigator.onLine || error.code === "ERR_NETWORK" || error.message === "Network Error") {
      const userMsg = "Server Connection Failed: Unable to reach Medical Inventory backend server. Please verify internet or Server API URL in ⚙️ Settings.";
      if (error.response) {
        error.response.data = { success: false, error: userMsg };
      } else {
        error.response = { data: { success: false, error: userMsg }, status: 0, statusText: "Offline" } as any;
      }
      return Promise.reject(error);
    }

    // 2. Detect API Timeout (Slow Internet / Unresponsive Server)
    if (error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout")) {
      const userMsg = "Request Timed Out: The server took too long to respond. Please check your signal and retry.";
      if (error.response) {
        error.response.data = { success: false, error: userMsg };
      } else {
        error.response = { data: { success: false, error: userMsg }, status: 408, statusText: "Timeout" } as any;
      }
      return Promise.reject(error);
    }

    // 3. Handle Status-Specific HTTP Errors
    const status = error.response?.status;

    // Authentication Expiration (401 Unauthorized / 403 Forbidden)
    if (status === 401) {
      if (!isLoggedOutToastShown) {
        isLoggedOutToastShown = true;
        showToast.warning("Session Expired: Please sign in again to continue.");
        setTimeout(() => {
          isLoggedOutToastShown = false;
        }, 5000);
      }
      performLogout();
      const userMsg = "Session expired. Please log in again.";
      error.response.data = { success: false, error: userMsg };
      return Promise.reject(error);
    }

    // Server Unavailable / Maintenance (502, 503, 504)
    if (status && [502, 503, 504].includes(status)) {
      const userMsg = "Server Unavailable (503): Medical Inventory backend is temporarily unreachable. Please try again shortly.";
      error.response.data = { success: false, error: userMsg };
      return Promise.reject(error);
    }

    // Internal Server Error (500)
    if (status && status >= 500) {
      const userMsg = "Internal Server Error (500): Unable to complete request. Please try again or contact support.";
      error.response.data = { success: false, error: userMsg };
      return Promise.reject(error);
    }

    // Sanitize any raw backend stack traces or internal exception details from client error messages
    if (error.response?.data?.error && typeof error.response.data.error === "string") {
      const rawErr = error.response.data.error;
      if (
        rawErr.includes("at ") ||
        rawErr.includes("SyntaxError") ||
        rawErr.includes("TypeError") ||
        rawErr.includes("<html") ||
        rawErr.includes("node_modules")
      ) {
        error.response.data.error = "An error occurred while processing your request. Please try again.";
      }
    }

    return Promise.reject(error);
  }
);
