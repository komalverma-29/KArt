"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArtworkForm } from "@/features/artworks/components/ArtworkForm";
import {
  publishArtworkAction,
  unpublishArtworkAction,
  archiveArtworkAction,
  restoreArtworkAction,
  softDeleteArtworkAction,
  permanentDeleteArtworkAction,
  duplicateArtworkAction,
} from "@/features/artworks/actions/artworkLifecycleActions";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

interface ArtworkEditorClientProps {
  artwork: {
    id: string;
    title: string;
    description: string | null;
    story: string | null;
    categoryId: string;
    collectionIds: string[];
    tags: string[];
    availability: string;
    forSale: boolean;
    price: number | null;
    featured: boolean;
    status: string;
  };
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
}

export function ArtworkEditorClient({
  artwork,
  categories,
  collections,
}: ArtworkEditorClientProps) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  async function runAction(
    action: (
      input: unknown,
    ) => Promise<{
      success: boolean;
      error?: { message: string };
    }>,
  ) {
    setActionError(null);
    setIsActing(true);

    try {
      const result = await action({ id: artwork.id });

      if (!result.success) {
        setActionError(result.error?.message ?? "Action failed.");
        return;
      }

      router.refresh();
    } finally {
      setIsActing(false);
    }
  }

  async function handleDuplicate() {
    setActionError(null);
    setIsActing(true);

    try {
      const result = await duplicateArtworkAction({ id: artwork.id });

      if (!result.success) {
        setActionError(
          result.error?.message ?? "Unable to duplicate artwork.",
        );
        return;
      }

      if (result.data?.id) {
        router.push(`/studio/artworks/${result.data.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setIsActing(false);
    }
  }

  async function handleSoftDelete() {
    setActionError(null);
    setIsActing(true);

    try {
      const result = await softDeleteArtworkAction({ id: artwork.id });

      if (!result.success) {
        setActionError(
          result.error?.message ?? "Unable to delete artwork.",
        );
        return;
      }

      router.push("/studio/artworks");
    } finally {
      setIsActing(false);
    }
  }

  async function handlePermanentDelete() {
    setActionError(null);
    setIsActing(true);

    try {
      const result = await permanentDeleteArtworkAction({
        id: artwork.id,
        confirmed: true,
      });

      if (!result.success) {
        setActionError(
          result.error?.message ??
            "Unable to permanently delete artwork.",
        );
        return;
      }

      router.push("/studio/artworks");
    } finally {
      setIsActing(false);
    }
  }

  return (
    <div className="space-y-8">
      <ArtworkForm
        artwork={{
          id: artwork.id,
          title: artwork.title,
          description: artwork.description,
          story: artwork.story,
          categoryId: artwork.categoryId,
          collectionIds: artwork.collectionIds,
          tags: artwork.tags,
          availability: artwork.availability,
          forSale: artwork.forSale,
          price: artwork.price,
          featured: artwork.featured,
        }}
        categories={categories}
        collections={collections}
        onSaved={() => router.refresh()}
      />

      <section className="border-t border-neutral-200 pt-6">
        <h2 className="mb-4 text-lg font-medium">Artwork actions</h2>

        {actionError && (
          <p className="mb-4 text-sm text-red-600">{actionError}</p>
        )}

        <div className="flex flex-wrap gap-3">
          {artwork.status === "DRAFT" && (
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  disabled={isActing}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Publish
                </button>
              }
              title="Publish artwork?"
              description="This artwork will become visible to visitors."
              confirmLabel="Publish"
              onConfirm={() => runAction(publishArtworkAction)}
            />
          )}

          {artwork.status === "PUBLISHED" && (
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  disabled={isActing}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Unpublish
                </button>
              }
              title="Unpublish artwork?"
              description="This artwork will no longer be visible to visitors."
              confirmLabel="Unpublish"
              onConfirm={() => runAction(unpublishArtworkAction)}
            />
          )}

          {artwork.status !== "ARCHIVED" && (
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  disabled={isActing}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Archive
                </button>
              }
              title="Archive artwork?"
              description="The artwork will be removed from active artwork listings."
              confirmLabel="Archive"
              onConfirm={() => runAction(archiveArtworkAction)}
            />
          )}

          {artwork.status === "ARCHIVED" && (
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  disabled={isActing}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Restore
                </button>
              }
              title="Restore artwork?"
              description="The artwork will be restored to the active artwork state."
              confirmLabel="Restore"
              onConfirm={() => runAction(restoreArtworkAction)}
            />
          )}

          <button
            type="button"
            disabled={isActing}
            onClick={handleDuplicate}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Duplicate
          </button>

          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={isActing}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            }
            title="Delete artwork?"
            description="The artwork will be moved out of the active artwork list."
            confirmLabel="Delete"
            destructive
            onConfirm={handleSoftDelete}
          />

          {artwork.status === "ARCHIVED" && (
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  disabled={isActing}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Permanently delete
                </button>
              }
              title="Permanently delete artwork?"
              description="This action cannot be undone. The artwork and its associated data will be permanently deleted."
              confirmLabel="Permanently delete"
              destructive
              onConfirm={handlePermanentDelete}
            />
          )}
        </div>
      </section>
    </div>
  );
}