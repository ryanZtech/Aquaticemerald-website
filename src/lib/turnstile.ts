interface TurnstileVerifyResult {
  success: boolean;
  errorCodes?: string[];
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  if (!token) {
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error(
      "TURNSTILE_SECRET_KEY is not configured — refusing to accept the submission rather than skip verification.",
    );
    return { success: false, errorCodes: ["missing-secret-key"] };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );

    if (!res.ok) {
      console.error("Turnstile siteverify HTTP error:", res.status);
      return { success: false, errorCodes: ["siteverify-http-error"] };
    }

    const data = await res.json();
    return {
      success: data?.success === true,
      errorCodes: data?.["error-codes"],
    };
  } catch (e) {
    console.error("Turnstile verification request failed:", e);
    return { success: false, errorCodes: ["network-error"] };
  }
}
