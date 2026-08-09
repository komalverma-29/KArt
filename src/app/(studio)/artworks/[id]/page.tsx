import { notFound } from "next/navigation";
import { ArtworkService } from "@/services/artwork/ArtworkService";
import { CategoryService } from "@/services/category/CategoryService";
import { CollectionService } from "@/services/collection/CollectionService";
import { ImageUploader } from "@/features/artworks/components/ImageUploader";
import { ArtworkEditorClient } from "./ArtworkEditorClient";

export default async function ArtworkEditorPage({ params }: { params: { id: string } }) {
  const artwork = await ArtworkService.getById(params.id);
  if (!artwork) notFound();

  const categories = await CategoryService.list("ACTIVE");
  const collections = await CollectionService.list();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{artwork.title}</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Images</h2>
        <ImageUploader artworkId={artwork.id} images={artwork.images} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Details</h2>
        <ArtworkEditorClient
          artwork={{
            id: artwork.id,
            title: artwork.title,
            description: artwork.description,
            story: artwork.story,
            categoryId: artwork.categoryId,
            collectionIds: artwork.collections.map((c) => c.collectionId),
            tags: artwork.tags.map((t) => t.tag.name),
            availability: artwork.availability,
            forSale: artwork.forSale,
            price: artwork.price ? Number(artwork.price) : null,
            featured: artwork.featured,
            status: artwork.status,
          }}
          categories={categories}
          collections={collections}
        />
      </section>
    </main>
  );
}