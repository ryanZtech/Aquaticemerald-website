"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export interface TurnstileHandle {
  /** Request a fresh token. Required before retrying after a failed
   * submission — Turnstile tokens are single-use, so re-submitting the
   * same token will be rejected by siteverify even if the widget still
   * visually shows a checkmark. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  function TurnstileWidget(
    { siteKey, onVerify, onExpire, onError, className },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const elementId = useId().replace(/:/g, "");

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      let cancelled = false;
      let pollId: ReturnType<typeof setInterval> | null = null;

      function renderWidget() {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return; // avoid double-render (e.g. StrictMode)
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerify(token),
          "expired-callback": () => {
            onExpire?.();
          },
          "error-callback": () => {
            onError?.();
          },
        });
      }

      if (window.turnstile) {
        renderWidget();
      } else {
        pollId = setInterval(() => {
          if (window.turnstile) {
            if (pollId) clearInterval(pollId);
            renderWidget();
          }
        }, 100);
      }

      return () => {
        cancelled = true;
        if (pollId) clearInterval(pollId);
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteKey]);

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          async
          defer
        />
        <div ref={containerRef} id={`turnstile-${elementId}`} className={className} />
      </>
    );
  },
);

export default TurnstileWidget;
