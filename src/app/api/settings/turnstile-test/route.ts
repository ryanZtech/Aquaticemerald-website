import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// A deliberately bogus response token. Cloudflare answers a *valid* secret
// with "invalid-input-response" for it, which is exactly what we want to see:
// the secret was accepted and the service answered. A bad secret comes back
// as "invalid-input-secret" instead. This proves the configuration without
// needing a real challenge to be solved first.
const PROBE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

// Real site keys are "0x4AAAAAAA…"; Cloudflare's documented test keys use
// the 1x/2x/3x prefixes.
const SITE_KEY_PATTERN = /^(0x|1x|2x|3x)[0-9A-Za-z_-]{10,}$/;

function reply(ok: boolean, message: string, errorCodes?: string[]) {
  return NextResponse.json(
    { ok, message, errorCodes: errorCodes ?? [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";

  if (!siteKey) {
    return reply(
      false,
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set, so the widget cannot render anywhere on the storefront.",
    );
  }
  if (!secretKey) {
    return reply(
      false,
      "TURNSTILE_SECRET_KEY is not set, so every verification is rejected before it reaches Cloudflare.",
    );
  }
  if (!SITE_KEY_PATTERN.test(siteKey)) {
    return reply(
      false,
      `The site key "${siteKey.slice(0, 12)}…" does not look like a Turnstile site key (expected something like 0x4AAAAAAA…).`,
    );
  }
  // Cloudflare's documented test secrets start with 2x/3x and are designed to
  // fail every challenge — they prove nothing about a real visitor's widget.
  if (/^[23]x/.test(secretKey)) {
    return reply(
      false,
      "TURNSTILE_SECRET_KEY is one of Cloudflare's test secrets, which always fails verification. Replace it with the real secret from the Turnstile dashboard.",
    );
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secretKey);
    body.set("response", PROBE_TOKEN);

    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return reply(
        false,
        `Cloudflare's verification endpoint answered HTTP ${response.status}. Try again in a moment.`,
      );
    }

    const data = (await response.json().catch(() => null)) as
      | { success?: boolean; "error-codes"?: string[] }
      | null;
    const errorCodes: string[] = data?.["error-codes"] ?? [];

    if (data?.success === true) {
      return reply(
        true,
        "Cloudflare accepted the keys. (This is a Turnstile test key pair, which always passes.)",
        errorCodes,
      );
    }

    if (errorCodes.includes("invalid-input-secret") || errorCodes.includes("missing-input-secret")) {
      return reply(
        false,
        "Cloudflare rejected TURNSTILE_SECRET_KEY. Copy the secret from the Turnstile widget dashboard and redeploy.",
        errorCodes,
      );
    }

    if (errorCodes.includes("invalid-input-response")) {
      return reply(
        true,
        "Cloudflare accepted the secret key and is reachable. The site key is well formed, so the widget should verify real visitors.",
        errorCodes,
      );
    }

    return reply(
      false,
      "Cloudflare answered but not in the expected way, so verification cannot be trusted.",
      errorCodes,
    );
  } catch (error) {
    console.error("Turnstile configuration test failed:", error);
    return reply(
      false,
      "Could not reach Cloudflare to test the keys. Check the server's network access and try again.",
    );
  }
}
