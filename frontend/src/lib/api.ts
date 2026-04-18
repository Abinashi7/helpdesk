import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  withCredentials: true,
});

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await api.get<T>(path);
  return res.data;
}
