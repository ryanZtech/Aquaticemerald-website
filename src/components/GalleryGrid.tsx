"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/app/components/ui/dialog";
import type { GalleryItem } from "@/lib/dataService";

export default function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState<GalleryItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="group text-left rounded-2xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open ${item.title}`}
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <img
                src={item.image_url}
                alt={item.title}
                loading="lazy"
                className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="mt-3 text-sm font-medium text-center">
              {item.title}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent
          showCloseButton={false}
          className="bg-card border-2 border-border rounded-3xl shadow-2xl p-0 gap-0 overflow-x-hidden overflow-y-auto max-h-[92dvh] sm:max-w-3xl"
          {...(active?.description ? {} : { "aria-describedby": undefined })}
        >
          {active && (
            <>
              <DialogClose
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </DialogClose>
              {/* Image first on every screen size, flush to the popup's top edge. */}
              <div className="w-full bg-muted flex items-center justify-center shrink-0">
                <img
                  src={active.image_url}
                  alt={active.title}
                  className="w-full max-h-[70vh] object-contain max-sm:h-[45vh] max-sm:max-h-none"
                />
              </div>
              <div className="p-5">
                <DialogTitle className="font-serif text-xl font-medium">
                  {active.title}
                </DialogTitle>
                {active.description && (
                  <DialogDescription className="mt-2 text-sm text-muted-foreground font-light leading-relaxed whitespace-pre-line">
                    {active.description}
                  </DialogDescription>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
