import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Serves locally stored uploads in development. In production this
 * route should be replaced by pointing StorageService at Cloudinary/S3
 * directly (design.md §3.2) — no other file needs to change.
 */
export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  const safeName = path.basename(params.filename);
  const ext = path.extname(safeName).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext];

  if (!contentType) {
    return NextResponse.json({ error: { message: "Not found." } }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(UPLOAD_ROOT, safeName));
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return NextResponse.json({ error: { message: "Not found." } }, { status: 404 });
  }
}