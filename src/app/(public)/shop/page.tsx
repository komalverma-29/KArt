import Link from "next/link";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";

export default async function ShopPage() {
  const artworks = await ArtworkRepository.list({
    status: "PUBLISHED",
  });

  const availableArtworks = artworks.filter(
    (artwork) =>
      artwork.forSale &&
      artwork.availability === "AVAILABLE"
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Shop
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          Discover artworks available for purchase.
        </p>
      </div>

      {availableArtworks.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 p-10 text-center">
          <p className="text-neutral-500">
            No artworks are currently available for purchase.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {availableArtworks.map((artwork) => {
            const primaryImage =
              artwork.images.find((image) => image.isPrimary) ??
              artwork.images[0] ??
              null;

            return (
              <Link
                key={artwork.id}
                href={`/shop/${artwork.slug}`}
                className="group"
              >
                <div className="overflow-hidden rounded-lg bg-neutral-100">
                  {primaryImage ? (
                    <img
                      src={primaryImage.url}
                      alt={primaryImage.altText ?? artwork.title}
                      className="aspect-square h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-sm text-neutral-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <h2 className="text-lg font-medium">
                    {artwork.title}
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    {artwork.category.name}
                  </p>

                  {artwork.price !== null &&
                    artwork.price !== undefined && (
                      <p className="mt-2 font-medium">
                        ${Number(artwork.price).toFixed(2)}
                      </p>
                    )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}