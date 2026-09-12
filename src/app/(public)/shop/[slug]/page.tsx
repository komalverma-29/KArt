import { notFound } from "next/navigation";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { ShopService } from "@/services/shop/ShopService";
import { PurchaseForm } from "@/features/shop/components/PurchaseForm";

interface ShopArtworkPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ShopArtworkPage({
  params,
}: ShopArtworkPageProps) {
  const { slug } = await params;

  const artwork = await ArtworkRepository.findBySlug(slug);

  if (!artwork || artwork.status !== "PUBLISHED") {
    notFound();
  }

  const purchasable = await ShopService.isPurchasable(artwork.id);

  const primaryImage =
    artwork.images.find((image) => image.isPrimary) ??
    artwork.images[0] ??
    null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-lg bg-neutral-100">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={primaryImage.altText ?? artwork.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              No image
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {artwork.title}
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            {artwork.category.name}
          </p>

          {artwork.collections.length > 0 && (
            <p className="mt-1 text-sm text-neutral-500">
              {artwork.collections
                .map((c) => c.collection.name)
                .join(", ")}
            </p>
          )}

          {artwork.price !== null &&
            artwork.price !== undefined && (
              <p className="mt-4 text-xl font-medium">
                ${Number(artwork.price).toFixed(2)}
              </p>
            )}

          <p className="mt-1 text-sm text-neutral-500">
            {artwork.availability.replace(/_/g, " ")}
          </p>

          {artwork.description && (
            <p className="mt-4 text-sm text-neutral-700">
              {artwork.description}
            </p>
          )}

          <div className="mt-6">
            {purchasable &&
            artwork.price !== null &&
            artwork.price !== undefined ? (
              <PurchaseForm
                artworkId={artwork.id}
                artworkTitle={artwork.title}
                unitPrice={Number(artwork.price)}
              />
            ) : (
              <p className="text-sm text-neutral-500">
                This artwork is not currently available for purchase.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}