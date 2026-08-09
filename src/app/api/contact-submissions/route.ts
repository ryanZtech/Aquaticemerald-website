import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { sanitizeEnv } from "@/lib/env";

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) return false;
    const secretStr = sanitizeEnv(process.env.JWT_SECRET);
    if (!secretStr) return false;
    const secret = new TextEncoder().encode(secretStr);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const rows = await sql`
      SELECT id, email, message, created_at
      FROM contact_submissions
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (e) {
    console.error("Failed to fetch contact submissions:", e);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await sql`DELETE FROM contact_submissions WHERE id = ${Number(id)}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Failed to delete contact submission:", e);
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
  }
}
