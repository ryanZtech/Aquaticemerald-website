"use server";

import { cookies, headers } from "next/headers";
import { compareSync } from "bcrypt-ts";
import { pool } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";
import { sanitizeEnv } from "@/lib/env";
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  signAdminToken,
} from "@/lib/adminAuth";

export async function loginAdmin(formData: FormData) {
  const password = formData.get("password") as string;
  const expectedHash = sanitizeEnv(process.env.ADMIN_PASSWORD_HASH);
  const jwtSecret = sanitizeEnv(process.env.JWT_SECRET);

  // 0. Check for Server Config Error
  if (!expectedHash || !jwtSecret) {
    console.error(
      "Auth Error: Missing or empty ADMIN_PASSWORD_HASH or JWT_SECRET in process.env",
    );
    return {
      error: "Server configuration error. Check environment variables.",
    };
  }

  if (!password || typeof password !== "string") return { error: "Invalid password" };
  let isMatch = false;

  // 1. Rate Limiting (3 tries per 5 minutes)
  if (!pool) return { error: "Login is temporarily unavailable. Please try again later." };
  try {
    const ip = getClientIp(await headers());
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`admin-login:${ip}`]);
      await client.query("DELETE FROM login_attempts WHERE ip_address = $1 AND attempted_at < NOW() - INTERVAL '5 minutes'", [ip]);
      const attempts = await client.query("SELECT count(*) FROM login_attempts WHERE ip_address = $1 AND attempted_at >= NOW() - INTERVAL '5 minutes'", [ip]);
      if (Number(attempts.rows[0].count) >= 3) {
        await client.query("ROLLBACK");
        return { error: "Too many attempts. Please wait 5 minutes." };
      }
      isMatch = compareSync(password, expectedHash);
      if (isMatch) await client.query("DELETE FROM login_attempts WHERE ip_address = $1", [ip]);
      else await client.query("INSERT INTO login_attempts (ip_address) VALUES ($1)", [ip]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Rate limiting check failed:", err);
    return { error: "Login is temporarily unavailable. Please try again later." };
  }

  try {
    // 2. Password verification is performed while holding the rate-limit lock.
    if (!isMatch) {
      return { error: "Invalid password" };
    }

    // 3. Create JWT Token payload
    const token = await signAdminToken();
    if (!token) return { error: "Server configuration error. Check environment variables." };

    // 4. Set httpOnly Cookie
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, adminCookieOptions());

    return { success: true };
  } catch (error) {
    console.error("Login processing failed:", error);
    return { error: "Authentication processing failed." };
  }
}

export async function logoutAdmin(formData: FormData) {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  return;
}
