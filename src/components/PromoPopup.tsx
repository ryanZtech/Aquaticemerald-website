"use client";

import { useState, useEffect } from "react";
import { X, Percent } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";

interface PopupData {
  id: number;
  name: string;
  heading: string;
  body_text: string | null;
  button_text: string;
  button_url: string;
  image_url: string | null;
  delay_seconds: number;
  active: boolean;
}

export default function PromoPopup() {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showCornerButton, setShowCornerButton] = useState(false);

  useEffect(() => {
    // Read the viewed list defensively — a corrupt value in localStorage
    // shouldn't take down the whole page's popup handling.
    const readViewedPopups = (): unknown[] => {
      try {
        const parsed = JSON.parse(
          localStorage.getItem("viewed_popups") || "[]"
        );
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const viewedPopups = readViewedPopups();

    // Fetch active popup
    fetch("/api/promo-popups")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setPopup(data);

          // Check if this popup was already viewed
          if (viewedPopups.includes(data.id)) {
            // Already viewed - show corner button immediately
            setShowCornerButton(true);
          } else {
            // Not viewed yet - show after delay
            const delayMs =
              Math.max(0, Number(data.delay_seconds) || 3) * 1000;
            setTimeout(() => {
              setShowPopup(true);
            }, delayMs);
          }
        }
      })
      .catch((err) => console.error("Failed to load promo popup:", err));
  }, []);

  const handleDismiss = () => {
    if (popup) {
      // Mark as viewed in localStorage
      try {
        const viewedPopups = JSON.parse(
          localStorage.getItem("viewed_popups") || "[]"
        );
        if (Array.isArray(viewedPopups) && !viewedPopups.includes(popup.id)) {
          viewedPopups.push(popup.id);
          localStorage.setItem("viewed_popups", JSON.stringify(viewedPopups));
        }
      } catch {
        // Ignore storage failures — dismissing the popup still works.
      }
    }
    setShowPopup(false);
    setShowCornerButton(true);
  };

  const handleReopen = () => {
    setShowPopup(true);
  };

  if (!popup) return null;

  // Defense-in-depth for a DB value that ends up in an href: allow only
  // web/mail/tel schemes and site-relative paths, never javascript:/data:
  // URLs (which would execute for every visitor if ever stored).
  const buttonUrl = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(popup.button_url)
    ? popup.button_url
    : "#";

  return (
    <>
      {/* Floating re-open button */}
      {showCornerButton && !showPopup && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={handleReopen}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
          aria-label="View promo"
        >
          <Percent className="w-6 h-6" />
        </motion.button>
      )}

      <Dialog.Root open={showPopup} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content aria-describedby={undefined} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-3xl">
              <div className="bg-card border-2 border-border rounded-3xl overflow-x-hidden overflow-y-auto max-h-[90dvh] shadow-2xl">
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Image spans the entire popup width, above the content */}
                {popup.image_url && (
                  <div className="relative w-full h-56 md:h-72 bg-muted">
                    <img
                      src={popup.image_url}
                      alt={popup.heading}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-8 md:p-10 flex flex-col justify-center">
                  <Dialog.Title className="font-serif text-3xl md:text-4xl font-bold mb-4">
                    {popup.heading}
                  </Dialog.Title>
                  {popup.body_text && (
                    <p className="text-muted-foreground mb-6 text-base leading-relaxed">
                      {popup.body_text}
                    </p>
                  )}
                  <Link
                    href={buttonUrl}
                    onClick={handleDismiss}
                    className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold text-center hover:opacity-90 transition-opacity duration-200"
                  >
                    {popup.button_text}
                  </Link>
                </div>
              </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
