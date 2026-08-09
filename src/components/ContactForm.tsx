"use client";

import { useRef, useState } from "react";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import TurnstileWidget, { TurnstileHandle } from "@/components/TurnstileWidget";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setErrorMessage("Please complete the verification check below.");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message, turnstileToken: token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        // The token was either rejected or already consumed — either way a
        // fresh one is required before the visitor can retry.
        setToken(null);
        turnstileRef.current?.reset();
        return;
      }

      setStatus("success");
      setEmail("");
      setMessage("");
      setToken(null);
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
      setToken(null);
      turnstileRef.current?.reset();
    }
  }

  if (status === "success") {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-serif text-xl font-medium mb-2">Message sent</h3>
        <p className="text-muted-foreground text-sm">
          Thanks for reaching out — we&apos;ll get back to you by email soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-5"
    >
      <div>
        <label htmlFor="contact-email" className="text-sm font-medium mb-1.5 block">
          Your Email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition-shadow"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="text-sm font-medium mb-1.5 block">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          minLength={5}
          maxLength={2000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What can we help with?"
          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition-shadow resize-none"
        />
      </div>

      <TurnstileWidget
        ref={turnstileRef}
        siteKey={TURNSTILE_SITE_KEY}
        onVerify={setToken}
        onExpire={() => setToken(null)}
        onError={() => setToken(null)}
      />

      {errorMessage && (
        <p className="text-sm text-destructive font-medium">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || !token}
        className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer transition-all duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Send Message
          </>
        )}
      </button>
    </form>
  );
}
