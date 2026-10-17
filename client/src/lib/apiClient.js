import { supabase } from "./supabaseClient.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

/**
 * Normalized API client that attaches the active Supabase JWT Bearer token
 * and standardizes error responses.
 */
export async function apiRequest(endpoint, options = {}) {
  const { session } = (await supabase.auth.getSession()).data || {};
  const token = session?.access_token;

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.error?.code || "REQUEST_FAILED";
    error.details = data?.error?.details || null;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: "GET", ...options }),
  post: (endpoint, body, options) => {
    const isFormData = body instanceof FormData;
    return apiRequest(endpoint, {
      method: "POST",
      body: isFormData ? body : JSON.stringify(body),
      ...options
    });
  },
  upload: (endpoint, formData, options) => apiRequest(endpoint, { method: "POST", body: formData, ...options }),
  put: (endpoint, body, options) => apiRequest(endpoint, { method: "PUT", body: JSON.stringify(body), ...options }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: "DELETE", ...options })
};
