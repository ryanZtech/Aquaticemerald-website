import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { put } from "@vercel/blob";
import { validateImageFile, safeImageKey } from "@/lib/fileValidation";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const blob = await put(safeImageKey("gallery", file), file, {
      access: "public",
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Error uploading gallery image:", error);
    const message = error instanceof Error ? error.message : "";
    // A store without BLOB_READ_WRITE_TOKEN can't reach blob storage at all.
    if (/token/i.test(message)) {
      return NextResponse.json(
        { error: "Image storage is not configured on this server." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
