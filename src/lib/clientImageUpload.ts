"use client";

/**
 * Vercel rejects a serverless request body over ~4.5 MB, so a photo is never
 * bundled with the rest of a form. Each photo travels in its own request, and
 * photos that are too big are re-encoded in the browser first.
 */
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

export interface UploadResult {
  url?: string;
  error?: string;
}

/** Re-encode an oversized photo so a single upload stays under the limit. */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES || file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    let longestEdge = 2400;
    let quality = 0.85;

    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, longestEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) break;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        bitmap.close();
        const name = file.name.replace(/\.[^.]+$/, "") || "image";
        return new File([blob], `${name}.webp`, { type: "image/webp" });
      }

      longestEdge = Math.round(longestEdge * 0.8);
      quality = Math.max(0.6, quality - 0.08);
    }

    bitmap.close();
  } catch (error) {
    // Falling back to the original keeps the upload possible; the server
    // still holds the final say on what it will accept.
    console.error("Could not resize image before upload:", error);
  }

  return file;
}

/** Send one form in the background so the caller can show real progress. */
export function postFormWithProgress(
  formData: FormData,
  endpoint: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve) => {
    const request = new XMLHttpRequest();
    request.open("POST", endpoint);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    request.onload = () => {
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(request.responseText) as { url?: string; error?: string };
      } catch {
        data = {};
      }

      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve({ url: data.url });
        return;
      }
      if (request.status === 413) {
        resolve({ error: "That image is too large for one upload. Try a smaller photo." });
        return;
      }
      resolve({ error: data.error || "Failed to upload image" });
    };

    request.onerror = () =>
      resolve({ error: "Failed to upload image. Check your connection and try again." });

    request.send(formData);
  });
}

/** Upload a single image file on its own, reporting progress as it travels. */
export async function uploadImageFile(
  file: File,
  endpoint: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  onProgress?.(1);
  const payload = await prepareImageForUpload(file);
  const formData = new FormData();
  formData.append("file", payload);
  return postFormWithProgress(formData, endpoint, onProgress);
}
