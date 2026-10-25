import axios from "axios";
import { resolveApiBaseUrl } from "./utils/apiBase";

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

// Attach the stored vendor-portal token (same key as existing apps) to requests.
// Browser storage is isolated per origin; this app manages its own session.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.token = token;
  }
  return config;
});

export default api;
