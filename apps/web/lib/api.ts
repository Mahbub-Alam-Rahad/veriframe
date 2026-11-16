import type { ApiErrorBody, MeResponse, SessionUser } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorBody;
  readonly requestId?: string;

  constructor(message: string, status: number, details?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.requestId = details?.requestId;
  }
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const payload = body as ApiErrorBody;
  if (Array.isArray(payload.message)) return payload.message.join(" ");
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  return fallback;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      messageFromBody(body, `Request failed with status ${response.status}`),
      response.status,
      body ?? undefined,
    );
  }

  return body as T;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/**
 * Browser-side API helper. Uses the same-origin rewrite so HTTP-only cookies
 * are sent automatically and no token ever reaches client JavaScript.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    body: payload,
    headers: finalHeaders,
    credentials: "include",
    cache: "no-store",
  });

  return parseResponse<T>(response);
}

/**
 * Server-side API helper. Calls the API directly (bypassing the Next rewrite)
 * and forwards the incoming cookie header. Only use from server components,
 * route handlers, or server actions.
 */
export async function serverApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const base = (process.env.API_INTERNAL_URL ?? "http://localhost:3001").replace(/\/$/, "");
  const headers = new Headers(init.headers);
  if (cookieHeader) headers.set("cookie", cookieHeader);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  const response = await fetch(`${base}/api/v1${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  return parseResponse<T>(response);
}

export async function getCurrentUser(): Promise<MeResponse | null> {
  try {
    return await serverApiRequest<MeResponse>("/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const response = await serverApiRequest<{ user: SessionUser }>("/auth/session");
    return response.user;
  } catch {
    return null;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
