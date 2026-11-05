const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const startsWith = (bytes: Uint8Array, offset: number, signature: number[]) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

/**
 * Identify an image from its actual leading bytes. The browser-supplied
 * `File.type` is just a string the client chose, so it proves nothing about
 * the content — anything (an HTML page, a script, a zip) can be uploaded with
 * `Content-Type: image/png` and would then be served publicly from blob
 * storage.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, 0, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  // RIFF....WEBP
  if (startsWith(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, 8, [0x57, 0x45, 0x42, 0x50])) {
    return "image/webp";
  }
  return null;
}

/**
 * Photos are uploaded one request at a time by the admin forms, which then
 * pass us the resulting URL. Only accept URLs that live in this project's own
 * public blob store — never an arbitrary external address.
 */
export function ownBlobImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return /\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/** Validate an uploaded image's size, declared MIME type and real content. */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { valid: false, error: "Unsupported file type. Please upload a PNG, JPEG, WEBP, or GIF image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { valid: false, error: "File is too large. Maximum size is 5MB." };
  }

  let head: Uint8Array;
  try {
    head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return { valid: false, error: "The uploaded file could not be read." };
  }

  const actualType = sniffImageType(head);
  if (!actualType) {
    return { valid: false, error: "That file is not a real PNG, JPEG, WEBP, or GIF image." };
  }
  if (actualType !== file.type) {
    return {
      valid: false,
      error: `The file's contents are ${actualType.replace("image/", "").toUpperCase()}, not ${file.type.replace("image/", "").toUpperCase()}.`,
    };
  }

  return { valid: true };
}

/** Build a safe, collision-resistant storage key instead of trusting the client-supplied filename. */
export function safeImageKey(prefix: string, file: File): string {
  const extension = file.type.split("/")[1] || "bin";
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
}
