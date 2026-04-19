import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development";

export type JwtPayload = { userId: string; email?: string };

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

/** Trả về userId (string) hoặc null nếu không có / token sai */
export function getUserIdFromRequest(req: Request): string | null {
  const t = getBearerToken(req);
  if (!t) return null;
  const p = verifyToken(t);
  if (!p?.userId) return null;
  return String(p.userId);
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ success: false, message }, { status: 401 });
}
