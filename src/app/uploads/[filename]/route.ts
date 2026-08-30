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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const safeName = path.basename(filename);
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