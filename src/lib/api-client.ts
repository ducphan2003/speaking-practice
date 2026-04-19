"use client";

/** Header Authorization cho fetch từ trình duyệt (localStorage). */
export function authHeaders(includeJsonBody = false): HeadersInit {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("auth_token");
  const h: Record<string, string> = {};
  if (t) h.Authorization = `Bearer ${t}`;
  if (includeJsonBody) h["Content-Type"] = "application/json";
  return h;
}
