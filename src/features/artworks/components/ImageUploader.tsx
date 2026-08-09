"use client";

import { useState, type ChangeEvent } from "react";
import {
  reorderArtworkImagesAction,
  setPrimaryArtworkImageAction,
  removeArtworkImageAction,
} from "@/features/artworks/actions/artworkImageActions";

interface ImageItem {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

export function ImageUploader({ artworkId, images }: { artworkId: string; images: ImageItem[] }) {
  const [localImages, setLocalImages] = useState(images);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("artworkId", artworkId);
    formData.append("file", file);

    const response = await fetch("/api/uploads/artwork", { method: "POST", body: formData });
    const result = await response.json();
    setIsUploading(false);
    event.target.value = "";

    if (!response.ok) {
      setError(result.error?.message ?? "Unable to upload image.");
      return;
    }

    setLocalImages((prev) => [...prev, result.data]);
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const next = [...localImages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLocalImages(next);
    await reorderArtworkImagesAction({ orderedImageIds: next.map((img) => img.id) });
  }

  async function makePrimary(imageId: string) {
    setLocalImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === imageId })));
    await setPrimaryArtworkImageAction({ artworkId, imageId });
  }

  async function removeImage(imageId: string) {
    setLocalImages((prev) => prev.filter((img) => img.id !== imageId));
    await removeArtworkImageAction({ imageId });
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Upload image</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={isUploading} />
      </label>
      {isUploading && <p className="text-sm text-neutral-500">Uploading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="grid grid-cols-3 gap-4">
        {localImages.map((image, index) => (
          <li key={image.id} className="rounded-md border border-neutral-200 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.altText ?? ""} className="mb-2 h-32 w-full object-cover" />
            <p className="mb-1 text-xs text-neutral-500">{image.isPrimary ? "Primary" : ""}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <button onClick={() => moveImage(index, -1)} className="underline">Up</button>
              <button onClick={() => moveImage(index, 1)} className="underline">Down</button>
              {!image.isPrimary && (
                <button onClick={() => makePrimary(image.id)} className="underline">Make primary</button>
              )}
              <button onClick={() => removeImage(image.id)} className="text-red-600 underline">Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}