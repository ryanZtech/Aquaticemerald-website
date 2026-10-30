import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
  adminCookieOptions,
  signAdminToken,
  unauthorizedResponse,
  verifyAdminToken,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * Sliding admin session check. The dashboard pings this while it is open:
 *
 *  - valid token  → re-issue it (so an active admin keeps working) and 200
 *  - invalid/none → clear the cookie and 401, so the client can send the admin
 *                   back to the login screen instead of letting every other
 *                   API request fail with an unexplained "Unauthorized".
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!(await verifyAdminToken(token))) {
    const response = unauthorizedResponse();
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      ...adminCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  const fresh = await signAdminToken();
  const response = NextResponse.json(
    { ok: true, expiresIn: ADMIN_SESSION_SECONDS },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  if (fresh) {
    response.cookies.set(ADMIN_SESSION_COOKIE, fresh, adminCookieOptions());
  }
  return response;
}
