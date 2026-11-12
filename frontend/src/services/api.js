import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Response interceptor to unwrap { success: true, data: ... }
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const monitoringAPI = {
  getLatest: () => api.get("/api/monitoring/latest"),
  getHistory: (host) => api.get(`/api/monitoring/${encodeURIComponent(host)}`),
  getAnalytics: (host) => api.get(`/api/monitoring/${encodeURIComponent(host)}/analytics`),
  getAll: (params) => api.get("/api/monitoring", { params }),
};

export const deviceAPI = {
  getAll: () => api.get("/api/devices"),
  getById: (id) => api.get(`/api/devices/${id}`),
  create: (data) => api.post("/api/devices", data),
  update: (id, data) => api.put(`/api/devices/${id}`, data),
  delete: (id) => api.delete(`/api/devices/${id}`),
};

export const faultAPI = {
  getAll: () => api.get("/api/faults"),
  getActive: () => api.get("/api/faults/active"),
  getHistory: () => api.get("/api/faults/history"),
};

export const settingsAPI = {
  get: () => api.get("/api/settings"),
  update: (data) => api.put("/api/settings", data),
};

export const healthAPI = {
  check: () => api.get("/api/health"),
};

export default api;

