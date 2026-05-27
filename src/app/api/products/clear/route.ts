import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { del } from "@vercel/blob";

// DELETE all products
export async function POST() {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Delete all images from blob storage first
    try {
      const imgs = await sql`SELECT image_url FROM images`;
      for (const img of imgs) {
        if (img.image_url && img.image_url.includes("vercel-storage.com")) {
          try {
            await del(img.image_url);
          } catch (e) {
            console.error("Failed to delete blob image:", img.image_url, e);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch image URLs before clearing:", e);
    }

    // Clear all products (cascades to variants, images, attributes)
    await sql`DELETE FROM products`;
    console.log("All products cleared successfully (images removed where possible)");

    return NextResponse.json({
      success: true,
      message: "All products have been deleted successfully. You can now add products from the admin panel.",
    });
  } catch (error) {
    console.error("Error clearing products:", error);
    return NextResponse.json({ error: "Failed to clear products" }, { status: 500 });
  }
}
