"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Keeps the admin panel honest about its session:
 *
 *  1. Pings /api/auth/session while the panel is open, which both renews the
 *     cookie (so an admin who is working is never logged out mid-task) and
 *     detects an expired one.
 *  2. Watches every same-origin /api/* response for a 401 — an expired token,
 *     a cleared cookie, a rotated JWT_SECRET — and treats it as a logout
 *     instead of leaving "Unauthorized" on a screen the admin can keep
 *     clicking around on.
 *
 * On expiry it covers the panel with a full-screen notice, drops the page from
 * the history with router.replace() so the previous admin screens can't be
 * revisited with the back button, and lands on the login screen.
 */
export default function AdminSessionGuard() {
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const expiredRef = useRef(false);
  const checking = useRef(false);

  const expire = useCallback(() => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    setExpired(true);
    // replace(), not push(): the signed-out admin must not be able to page
    // back into data they no longer have access to.
    router.replace("/login?expired=1");
  }, [router]);

  const check = useCallback(async () => {
    if (expiredRef.current || checking.current) return;
    checking.current = true;
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.status === 401) expire();
    } catch {
      // Transient network failure — keep the session and try again next tick
      // rather than logging the admin out over a blip.
    } finally {
      checking.current = false;
    }
  }, [expire]);

  useEffect(() => {
    void check();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, CHECK_INTERVAL_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    const originalFetch = window.fetch.bind(window);
    const patchedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      if (response.status === 401) {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const isAdminApi = /(^|\/)api\//.test(url) && !/\/api\/auth\//.test(url);
        if (isAdminApi) expire();
      }
      return response;
    };
    window.fetch = patchedFetch;

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
    };
  }, [check, expire]);

  if (!expired) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Signed out"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-6"
    >
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="font-serif text-2xl font-medium">You&apos;ve been signed out</h2>
        <p className="mt-2 text-sm text-muted-foreground font-light">
          Your admin session expired while the panel was idle, so the screens
          behind this notice are no longer accessible. Sign in again to carry on.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Taking you to the login screen…
        </div>
      </div>
    </div>
  );
}
