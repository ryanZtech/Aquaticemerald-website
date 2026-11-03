/** Upload cap per gallery entry — enough for a full project walk-through. */
export const MAX_GALLERY_IMAGES = 20;

/**
 * Normalise the photo list submitted for a gallery entry.
 *
 * New entries send `image_urls`; a single `image_url` is still accepted so an
 * older client (or an entry saved before multi-image support) keeps working.
 * Order is preserved — the first photo is the cover shown in the grid.
 */
export function normalizeGalleryImages(
  imageUrls: unknown,
  fallbackImageUrl?: unknown,
): string[] {
  const rawList = Array.isArray(imageUrls) ? imageUrls : [fallbackImageUrl];
  const urls = rawList
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return Array.from(new Set(urls)).slice(0, MAX_GALLERY_IMAGES);
}
