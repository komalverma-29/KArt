"use client";

import { useRouter } from "next/navigation";
import { ArtworkForm } from "@/features/artworks/components/ArtworkForm";

interface NewArtworkClientProps {
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
}

export function NewArtworkClient({
  categories,
  collections,
}: NewArtworkClientProps) {
  const router = useRouter();

  return (
    <ArtworkForm
      categories={categories}
      collections={collections}
      onSaved={(id) => {
        router.push(`/studio/artworks/${id}`);
      }}
    />
  );
}