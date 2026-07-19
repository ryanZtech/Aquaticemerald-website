"use server";

import { cookies, headers } from "next/headers";
import { compareSync } from "bcrypt-ts";
import { SignJWT } from "jose";
import { sql } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";

const sanitizeEnv = (val: string | undefined) => {
  if (!val) return undefined;
  return val.replace(/^['"]|['"]$/g, "");
};

export async function loginAdmin(formData: FormData) {
  const password = formData.get("password") as string;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  // 0. Check for Server Config Error
  if (!expectedHash || !jwtSecret) {
    console.error(
      "Auth Error: Missing or empty ADMIN_PASSWORD_HASH or JWT_SECRET in process.env",
    );
    return {
      error: "Server configuration error. Check environment variables.",
    };
  }

  // 1. Rate Limiting (3 tries per 5 minutes)
  if (!sql) {
    console.error("Database connection unavailable for rate limiting.");
  } else {
    try {
      const headerList = await headers();
      const ip = getClientIp(headerList);

      // Clean up old attempts (> 5 mins)
      await sql`DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '5 minutes'`;

      // Count recent attempts
      const attemptsResult =
        await sql`SELECT count(*) FROM login_attempts WHERE ip_address = ${ip}`;
      const attemptCount = parseInt(attemptsResult[0].count);

      if (attemptCount >= 3) {
        return { error: "Too many attempts. Please wait 5 minutes." };
      }

      // Log this attempt
      await sql`INSERT INTO login_attempts (ip_address) VALUES (${ip})`;
    } catch (err) {
      console.error("Rate limiting check failed:", err);
    }
  }

  try {
    // 2. Verify Password
    const isMatch = compareSync(password, expectedHash);
    if (!isMatch) {
      return { error: "Invalid password" };
    }

    // 3. Create JWT Token payload
    const secret = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(secret);

    // 4. Set httpOnly Cookie
    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("Login processing failed:", error);
    return { error: "Authentication processing failed." };
  }
}

export async function logoutAdmin(formData: FormData) {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return;
}
