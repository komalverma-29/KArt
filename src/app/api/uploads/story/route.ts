import { NextRequest, NextResponse } from "next/server";
import { requireArtistSession } from "@/lib/authGuard";
import { StorageService, StorageValidationError } from "@/services/storage/StorageService";

// Reuses StorageService — no duplicated upload/storage logic vs. artwork.
export async function POST(req: NextRequest) {
  const artist = await requireArtistSession();
  if (!artist) return NextResponse.json({ error: { message: "Unauthorized." } }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: { message: "A file is required." } }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await StorageService.saveImage({ buffer, originalFilename: file.name, mimeType: file.type });
    return NextResponse.json({ success: true, data: stored });
  } catch (error) {
    if (error instanceof StorageValidationError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 422 });
    }
    console.error("[uploads/story]", error);
    return NextResponse.json({ error: { message: "Unable to upload image." } }, { status: 500 });
  }
}