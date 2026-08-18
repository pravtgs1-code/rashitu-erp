import axios from "axios";

// In local dev, Vite proxies "/api" to the backend (see vite.config.ts).
// In production (e.g. deployed on Render as two separate services), set
// VITE_API_BASE at build time to the backend's full URL, e.g.
// VITE_API_BASE=https://rasitu-backend.onrender.com
const base = import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api` : "/api";
export const api = axios.create({ baseURL: base });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rasitu_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("rasitu_token");
      localStorage.removeItem("rasitu_user");
      localStorage.removeItem("rasitu_tenant");
      if (location.pathname !== "/login") location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ---------------------------------------------------------------
// Offline-first write queue.
// If a POST/PATCH fails because the device has no network, the
// request is stored in localStorage and replayed automatically
// the next time the browser comes back online. This lets staff
// (e.g. a teacher marking attendance, or transport staff on a bus)
// keep working without signal - nothing is lost, and School
// Management sees the data the moment it syncs back.
// ---------------------------------------------------------------
export interface QueuedWrite {
  id: string;
  method: "post" | "patch";
  url: string;
  data: any;
  queuedAt: string;
}

const QUEUE_KEY = "rasitu_offline_queue";

export function getQueue(): QueuedWrite[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(q: QueuedWrite[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export async function writeWithOfflineFallback(method: "post" | "patch", url: string, data: any) {
  try {
    const res = await api.request({ method, url, data });
    return { ok: true, offline: false, data: res.data };
  } catch (err: any) {
    const isNetworkError = !err?.response;
    if (isNetworkError) {
      const item: QueuedWrite = { id: Math.random().toString(36).slice(2), method, url, data, queuedAt: new Date().toISOString() };
      const q = getQueue();
      q.push(item);
      saveQueue(q);
      return { ok: true, offline: true, data: null };
    }
    throw err;
  }
}

export async function syncOfflineQueue(onProgress?: (done: number, total: number) => void) {
  const q = getQueue();
  if (q.length === 0) return { synced: 0 };
  let synced = 0;
  const remaining: QueuedWrite[] = [];
  for (const item of q) {
    try {
      await api.request({ method: item.method, url: item.url, data: item.data });
      synced++;
    } catch {
      remaining.push(item); // keep retrying later
    }
    onProgress?.(synced, q.length);
  }
  saveQueue(remaining);
  return { synced, remaining: remaining.length };
}

window.addEventListener("online", () => {
  syncOfflineQueue();
});

// Fetches a PDF (or any binary) endpoint WITH the auth header attached
// (a plain <a href> can't send Authorization headers) and opens it in a
// new tab as a blob URL - used for fee receipts and marksheets.
export async function openAuthenticatedPdf(url: string) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  window.open(blobUrl, "_blank");
}
