const TOKEN_KEY = "emman.library.session";

export const sessionStore = {
  read: () => localStorage.getItem(TOKEN_KEY),
  write: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

interface CallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

export async function call<T>(path: string, opts: CallOptions = {}): Promise<T> {
  const API_BASE = (import.meta.env.VITE_API_TARGET || "https://emman-reading-room.onrender.com").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const fullPath = cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
  const url = new URL(fullPath, API_BASE);

  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const token = sessionStore.read();
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });

  if (res.status === 204) return undefined as T;
  const payload = await res.json().catch(() => ({}));
  if (res.ok) return payload as T;

  const err = payload?.error ?? {};
  throw new ApiError(res.status, err.code ?? "ERROR", err.message ?? "Request failed.", err);
}

export async function triggerCardDownload(ticketUrl: string): Promise<void> {
  const API_BASE = (
    import.meta.env.VITE_API_TARGET ||
    "https://emman-reading-room.onrender.com"
  ).replace(/\/+$/, "");

  const downloadUrl = new URL(ticketUrl, API_BASE);

  const token = sessionStore.read();

  const response = await fetch(downloadUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.error?.message || "Could not download the PDF."
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "emman-reading-room-card.pdf";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}

