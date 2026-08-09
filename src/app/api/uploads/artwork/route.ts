import { NextRequest, NextResponse } from "next/server";
import { requireArtistSession } from "@/lib/authGuard";
import { ArtworkImageService, ArtworkImageServiceError } from "@/services/artwork/ArtworkImageService";

export async function POST(req: NextRequest) {
  const artist = await requireArtistSession();
  if (!artist) {
    return NextResponse.json({ error: { message: "Unauthorized." } }, { status: 401 });
  }

  const formData = await req.formData();
  const artworkId = formData.get("artworkId");
  const altText = formData.get("altText");
  const file = formData.get("file");

  if (typeof artworkId !== "string" || !artworkId) {
    return NextResponse.json({ error: { message: "An artwork id is required." } }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { message: "A file is required." } }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await ArtworkImageService.addImage(
      artworkId,
      { buffer, originalFilename: file.name, mimeType: file.type },
      typeof altText === "string" ? altText : undefined
    );
    return NextResponse.json({ success: true, data: image });
  } catch (error) {
    if (error instanceof ArtworkImageServiceError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 422 });
    }
    // Never leak raw error detail to the client (tech.md §Error Security).
    console.error("[uploads/artwork]", error);
    return NextResponse.json({ error: { message: "Unable to upload image." } }, { status: 500 });
  }
}