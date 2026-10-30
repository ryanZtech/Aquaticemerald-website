import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { NextResponse } from "next/server";
import { sanitizeEnv } from "@/lib/env";

export const ADMIN_SESSION_COOKIE = "admin_session";

// How long one signed admin token stays valid. The dashboard's session guard
// re-issues the cookie on a timer while the panel is open, so an admin who is
// actually working never gets thrown out mid-task. Once the panel is closed
// (or left idle past this window) every admin request starts failing with a
// 401 and the UI shows the signed-out screen instead of a wall of
// "Unauthorized" responses on screens the admin can still click around.
export const ADMIN_SESSION_SECONDS = 60 * 60 * 2;

const EXPIRED_MESSAGE =
  "Your admin session has expired. Please sign in again.";

function adminSecret(): Uint8Array | null {
  const secretStr = sanitizeEnv(process.env.JWT_SECRET);
  if (!secretStr) return null;
  return new TextEncoder().encode(secretStr);
}

/** Cookie attributes shared by login and session renewal. */
export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

/** Verify a session token without touching the request's cookies. */
export async function verifyAdminToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const secret = adminSecret();
  if (!secret) {
    console.error("adminAuth: JWT_SECRET is not configured");
    return false;
  }
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

/** Sign a fresh admin session token (same claims the login action issues). */
export async function signAdminToken(): Promise<string | null> {
  const secret = adminSecret();
  if (!secret) return null;
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_SECONDS}s`)
    .sign(secret);
}

/** The standard 401 body for admin routes. */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: EXPIRED_MESSAGE, code: "session_expired" },
    { status: 401, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return unauthorizedResponse();
  }

  if (!adminSecret()) {
    console.error("adminAuth: JWT_SECRET is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  if (!(await verifyAdminToken(token))) {
    return unauthorizedResponse();
  }

  return null;
}
