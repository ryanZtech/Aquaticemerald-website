"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/app/components/ui/dialog";
import type { GalleryItem } from "@/lib/dataService";

/** Photos of one entry — rows saved before multi-image support only have one. */
function imagesOf(item: GalleryItem): string[] {
  const images = Array.isArray(item.images) && item.images.length > 0
    ? item.images.filter(Boolean)
    : [item.image_url].filter(Boolean);
  return images.length > 0 ? images : [item.image_url];
}

export default function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState<GalleryItem | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const activeImages = active ? imagesOf(active) : [];
  const currentIndex = activeImages.length
    ? Math.min(imageIndex, activeImages.length - 1)
    : 0;
  const currentImage = activeImages[currentIndex];

  const openItem = (item: GalleryItem) => {
    setImageIndex(0);
    setActive(item);
  };

  const nextImage = () => {
    setImageIndex((prev) =>
      activeImages.length ? (prev + 1) % activeImages.length : 0,
    );
  };

  const prevImage = () => {
    setImageIndex((prev) =>
      activeImages.length
        ? (prev - 1 + activeImages.length) % activeImages.length
        : 0,
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const images = imagesOf(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
              className="group text-left rounded-2xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Open ${item.title}`}
            >
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <img
                  src={images[0]}
                  alt={item.title}
                  loading="lazy"
                  className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-3 text-sm font-medium text-center">
                {item.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* The popup keeps one fixed footprint: the photo stage has a fixed
          height and the photo is letterboxed inside it, so switching between
          portrait and landscape shots never resizes the window. */}
      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent
          showCloseButton={false}
          className="bg-card border-2 border-border rounded-3xl shadow-2xl p-0 gap-0 overflow-hidden flex flex-col h-[92dvh] sm:h-[85dvh] sm:max-w-3xl!"
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
              {/* Photo carousel, same controls as a product page: arrows over
                  the image, dots underneath, thumbnails to jump around. */}
              <div className="shrink-0">
                <div className="relative w-full h-[46dvh] sm:h-[46dvh] bg-muted flex items-center justify-center">
                  <img
                    src={currentImage}
                    alt={`${active.title} — photo ${currentIndex + 1} of ${activeImages.length}`}
                    className="w-full h-full object-contain"
                  />

                  {activeImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full z-20 cursor-pointer transition-colors shadow-md"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full z-20 cursor-pointer transition-colors shadow-md"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                        {activeImages.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setImageIndex(index)}
                            aria-label={`Go to image ${index + 1}`}
                            className={`rounded-full transition-all cursor-pointer ${
                              index === currentIndex
                                ? "w-5 h-2 bg-white"
                                : "w-2 h-2 bg-white/50 hover:bg-white/80"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {activeImages.length > 1 && (
                  <div
                    className="flex gap-2 overflow-x-auto px-3 pt-3"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {activeImages.map((url, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setImageIndex(index)}
                        className={`flex-none w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer focus:outline-none ${
                          index === currentIndex
                            ? "border-primary ring-2 ring-primary/30 opacity-100"
                            : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                        }`}
                        aria-label={`View image ${index + 1}`}
                      >
                        <img
                          src={url}
                          alt={`${active.title} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-5">
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
