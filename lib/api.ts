import { getAccessToken } from "./supabase";
import type { Exam, ProfilePayload, User } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_API_BASE_URL. Copy .env.example to .env.local.");
}

/** Thrown for any non-2xx response. `unauthorized` drives the route-back-to-phone branch. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
  get unauthorized() {
    return this.status === 401;
  }
}

/** `detail` is either a string or FastAPI's validation-error array. Flatten both to one line. */
function readDetail(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === "object" && typeof (item as { msg?: unknown }).msg === "string"
          ? (item as { msg: string }).msg
          : null
      )
      .filter((m): m is string => Boolean(m));
    if (messages.length) return messages.join(". ");
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
  } catch {
    // Network-level failure: fetch rejects, so there is no status to report.
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = readDetail(body);
    if (response.status === 401) {
      throw new ApiError(401, "Your session has expired. Please sign in again.");
    }
    throw new ApiError(response.status, detail ?? "Something went wrong. Please try again.");
  }

  return response.json() as Promise<T>;
}

export function getMe() {
  return request<User>("/me");
}

export function updateProfile(payload: ProfilePayload) {
  return request<User>("/me/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getExams() {
  return request<Exam[]>("/exams");
}
