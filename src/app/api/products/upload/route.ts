import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { put } from "@vercel/blob";
import { validateImageFile, safeImageKey } from "@/lib/fileValidation";

/**
 * One photo per request. Product saves used to carry every photo in a single
 * multipart body, which Vercel rejects once it passes ~4.5MB
 * (FUNCTION_PAYLOAD_TOO_LARGE). The form uploads each photo here first and
 * then saves the product with the returned URLs.
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validation = await validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const blob = await put(safeImageKey("products", file), file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Error uploading product image:", error);
    const message = error instanceof Error ? error.message : "";
    if (/token/i.test(message)) {
      return NextResponse.json(
        { error: "Image storage is not configured on this server." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
