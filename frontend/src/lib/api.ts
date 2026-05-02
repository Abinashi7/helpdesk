import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  withCredentials: true,
});

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await api.get<T>(path);
  return res.data;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await api.post<T>(path, body);
  return res.data;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await api.patch<T>(path, body);
  return res.data;
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const res = await api.delete<T>(path);
  return res.data;
}
