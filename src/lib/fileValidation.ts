const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate an uploaded image's MIME type and size before storing it. */
export function validateImageFile(file: File): FileValidationResult {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { valid: false, error: "Unsupported file type. Please upload a PNG, JPEG, WEBP, or GIF image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { valid: false, error: "File is too large. Maximum size is 5MB." };
  }
  return { valid: true };
}

/** Build a safe, collision-resistant storage key instead of trusting the client-supplied filename. */
export function safeImageKey(prefix: string, file: File): string {
  const extension = file.type.split("/")[1] || "bin";
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
}
