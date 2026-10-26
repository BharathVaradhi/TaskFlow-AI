import axios from "axios";

// Determine API base URL: use VITE_API_URL if configured, otherwise default to relative '/api'
// which Vite proxies in dev and production reverse proxies route cleanly without localhost dependencies.
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In dev or prod with proxy, relative /api is portable and robust
  return "/api";
};

const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle global errors (like 401 Unauthorized redirect)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if we are already on login or register
      const isAuthPage = window.location.pathname.includes("/login") || window.location.pathname.includes("/register");
      if (!isAuthPage) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
