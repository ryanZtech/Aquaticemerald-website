"use client";

import { useState, useEffect } from "react";
import { X, Percent } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

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
    // Check if already viewed in localStorage
    const viewedPopups = JSON.parse(localStorage.getItem("viewed_popups") || "[]");
    
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
            setTimeout(() => {
              setShowPopup(true);
            }, data.delay_seconds * 1000);
          }
        }
      })
      .catch((err) => console.error("Failed to load promo popup:", err));
  }, []);

  const handleDismiss = () => {
    if (popup) {
      // Mark as viewed in localStorage
      const viewedPopups = JSON.parse(localStorage.getItem("viewed_popups") || "[]");
      if (!viewedPopups.includes(popup.id)) {
        viewedPopups.push(popup.id);
        localStorage.setItem("viewed_popups", JSON.stringify(viewedPopups));
      }
    }
    setShowPopup(false);
    setShowCornerButton(true);
  };

  const handleReopen = () => {
    setShowPopup(true);
  };

  if (!popup) return null;

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

      {/* Popup modal */}
      <AnimatePresence>
        {showPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismiss}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Popup content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-3xl"
            >
              <div className="bg-card border-2 border-border rounded-3xl overflow-hidden shadow-2xl">
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="grid md:grid-cols-2">
                  {/* Image side */}
                  {popup.image_url && (
                    <div className="relative h-64 md:h-auto bg-muted">
                      <img
                        src={popup.image_url}
                        alt={popup.heading}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content side */}
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
                      {popup.heading}
                    </h2>
                    {popup.body_text && (
                      <p className="text-muted-foreground mb-6 text-base leading-relaxed">
                        {popup.body_text}
                      </p>
                    )}
                    <Link
                      href={popup.button_url}
                      onClick={handleDismiss}
                      className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold text-center hover:opacity-90 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                    >
                      {popup.button_text}
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
