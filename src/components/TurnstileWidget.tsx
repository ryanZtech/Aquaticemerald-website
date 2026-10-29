"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export interface TurnstileHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ siteKey, onVerify, onExpire, onError, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const callbacks = useRef({ onVerify, onExpire, onError });
    callbacks.current = { onVerify, onExpire, onError };
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
      },
    }));

    useEffect(() => {
      let cancelled = false;
      let rendered = false;
      const fail = () => {
        if (cancelled) return;
        setError("Verification could not load. Check your connection or blocker, then retry.");
        callbacks.current.onError?.();
      };
      const render = () => {
        if (cancelled || rendered || !window.turnstile || !containerRef.current) return;
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => { clearTimeout(timeout); setError(""); callbacks.current.onVerify(token); },
            "expired-callback": () => callbacks.current.onExpire?.(),
            "error-callback": () => { fail(); return true; },
          });
          rendered = true;
          clearInterval(interval);
          clearTimeout(timeout);
        } catch {
          fail();
        }
      };
      if (!siteKey) {
        setError("Verification is not configured. Please contact the store.");
        callbacks.current.onError?.();
        return;
      }
      setError("");
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
      if (!script && !window.turnstile) {
        script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        document.head.appendChild(script);
      }
      const interval = setInterval(render, 100);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        fail();
      }, 10000);
      script?.addEventListener("error", fail);
      render();
      return () => {
        cancelled = true;
        clearInterval(interval);
        clearTimeout(timeout);
        script?.removeEventListener("error", fail);
        if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      };
    }, [siteKey, attempt]);

    return (
      <div className={className}>
        <div ref={containerRef} />
        {error && (
          <div role="alert" className="text-sm text-destructive mt-2">
            <p>{error}</p>
            {siteKey && <button type="button" className="underline mt-1" onClick={() => {
              if (!window.turnstile) document.querySelector(`script[src="${SCRIPT_URL}"]`)?.remove();
              setAttempt((value) => value + 1);
            }}>Retry verification</button>}
          </div>
        )}
      </div>
    );
  },
);

export default TurnstileWidget;
