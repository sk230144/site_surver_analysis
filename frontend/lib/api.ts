export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error: any = new Error(`GET ${path} failed`);
    error.response = { data: errorData };
    throw error;
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error: any = new Error(`POST ${path} failed`);
    error.response = { data: errorData };
    throw error;
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: "DELETE" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error: any = new Error(`DELETE ${path} failed`);
    error.response = { data: errorData };
    throw error;
  }
  return res.json();
}
