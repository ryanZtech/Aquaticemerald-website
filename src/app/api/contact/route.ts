import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { escapeHtml } from "@/lib/emailTemplatesSimple";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Ensure the table exists — runs once per cold start, cheap after that.
async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function POST(request: NextRequest) {
  // Rate limit first and cheaply, before spending a Turnstile siteverify
  // call or a DB round trip on an obviously abusive burst of requests.
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000); // 5 per 10 min per IP
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many messages sent. Please try again later." },
      { status: 429 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, message, turnstileToken } = body || {};

  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim().length < 5) {
    return NextResponse.json({ error: "Please enter a message (at least 5 characters)." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message is too long (max 2000 characters)." }, { status: 400 });
  }

  const verification = await verifyTurnstileToken(turnstileToken, ip);
  if (!verification.success) {
    return NextResponse.json(
      { error: "Verification failed. Please retry the check below." },
      { status: 400 },
    );
  }

  const cleanEmail = email.trim().slice(0, 320);
  const cleanMessage = message.trim().slice(0, 2000);

  // Persist submission to the database
  try {
    await ensureTable();
    if (sql) {
      await sql`
        INSERT INTO contact_submissions (email, message)
        VALUES (${cleanEmail}, ${cleanMessage})
      `;
    }
  } catch (e) {
    console.error("Failed to save contact submission to DB:", e);
    // Non-fatal — we still attempt to send the email.
  }

  let sellerEmail: string | null = null;
  try {
    if (sql) {
      const rows = await sql`SELECT value FROM store_settings WHERE key = 'seller_email' LIMIT 1`;
      sellerEmail = rows[0]?.value || null;
    }
  } catch (e) {
    console.error("Failed to load seller_email setting:", e);
  }
  sellerEmail = sellerEmail || process.env.SELLER_EMAIL || null;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (RESEND_API_KEY && sellerEmail) {
    const fromEmail = process.env.EMAIL_FROM || "Aquatic Emerald <orders@aquaticemerald.com>";
    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">New contact form message</h2>
        <p style="color: #666; margin-top: 0;">From: ${escapeHtml(cleanEmail)}</p>
        <div style="white-space: pre-wrap; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-top: 16px;">
          ${escapeHtml(cleanMessage)}
        </div>
      </div>
    `;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: sellerEmail,
          reply_to: cleanEmail,
          subject: `New contact form message from ${cleanEmail}`,
          html,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to send contact form email:", errorData);
        return NextResponse.json(
          { error: "Failed to send your message. Please try again or reach out via WhatsApp." },
          { status: 502 },
        );
      }
    } catch (e) {
      console.error("Failed to send contact form email:", e);
      return NextResponse.json(
        { error: "Failed to send your message. Please try again or reach out via WhatsApp." },
        { status: 502 },
      );
    }
  } else {
    console.error(
      "Contact form: cannot send email — RESEND_API_KEY or seller_email is not configured.",
    );
    return NextResponse.json(
      { error: "This form isn't set up to send messages yet. Please reach out via WhatsApp instead." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
