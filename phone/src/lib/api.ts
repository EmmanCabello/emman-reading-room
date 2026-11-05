import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "emman.library.session";
const BASE_KEY = "emman.library.apiBase";

/** Android emulators reach the host machine at 10.0.2.2. Override on the Account tab for a real phone. */
export const DEFAULT_API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === "android" ? "http://10.0.2.2:4100" : "http://localhost:4100");

let apiBase = DEFAULT_API_BASE;
let token: string | null = null;

export const connection = {
  async load() {
    apiBase = (await AsyncStorage.getItem(BASE_KEY)) ?? DEFAULT_API_BASE;
    token = await AsyncStorage.getItem(TOKEN_KEY);
    return { apiBase, token };
  },
  get base() {
    return apiBase;
  },
  get token() {
    return token;
  },
  async setToken(next: string | null) {
    token = next;
    if (next) await AsyncStorage.setItem(TOKEN_KEY, next);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  },
  async setBase(next: string) {
    apiBase = next.trim().replace(/\/$/, "") || DEFAULT_API_BASE;
    await AsyncStorage.setItem(BASE_KEY, apiBase);
  }
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

interface CallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

/** The phone only ever talks to the Express API over HTTP. */
export async function call<T>(path: string, opts: CallOptions = {}): Promise<T> {
  const params = Object.entries(opts.query ?? {})
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  const url = `${apiBase}/api${path}${params ? `?${params}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });
  } catch {
    throw new ApiError(0, "NETWORK", `Cannot reach the API at ${apiBase}. Check the server address on the Account tab.`);
  }
  if (res.status === 204) return undefined as T;
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = payload?.error ?? {};
    throw new ApiError(res.status, err.code ?? "ERROR", err.message ?? "Request failed.");
  }
  return payload as T;
}
