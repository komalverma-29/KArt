"use client";

import { useState, type FormEvent } from "react";
import { createArtworkAction } from "@/features/artworks/actions/createArtworkAction";
import { updateArtworkAction } from "@/features/artworks/actions/updateArtworkAction";

interface ArtworkFormProps {
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
  artwork?: {
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
  };
  onSaved: (id: string) => void;
}

const AVAILABILITY_OPTIONS = ["AVAILABLE", "RESERVED", "SOLD", "NOT_FOR_SALE", "COMMISSION_AVAILABLE"];

export function ArtworkForm({ categories, collections, artwork, onSaved }: ArtworkFormProps) {
  const [title, setTitle] = useState(artwork?.title ?? "");
  const [description, setDescription] = useState(artwork?.description ?? "");
  const [story, setStory] = useState(artwork?.story ?? "");
  const [categoryId, setCategoryId] = useState(artwork?.categoryId ?? categories[0]?.id ?? "");
  const [collectionIds, setCollectionIds] = useState<string[]>(artwork?.collectionIds ?? []);
  const [tagsInput, setTagsInput] = useState((artwork?.tags ?? []).join(", "));
  const [availability, setAvailability] = useState(artwork?.availability ?? "AVAILABLE");
  const [forSale, setForSale] = useState(artwork?.forSale ?? false);
  const [price, setPrice] = useState(artwork?.price?.toString() ?? "");
  const [featured, setFeatured] = useState(artwork?.featured ?? false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const payload = {
      title,
      description: description || undefined,
      story: story || undefined,
      categoryId,
      collectionIds,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      availability,
      forSale,
      price: forSale && price !== "" ? Number(price) : undefined,
      featured,
    };

    const result = artwork
      ? await updateArtworkAction({ id: artwork.id, ...payload })
      : await createArtworkAction(payload);

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error.message);
      if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
      return;
    }

    onSaved(result.data.id);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        {fieldErrors.title?.map((m) => <p key={m} className="mt-1 text-sm text-red-600">{m}</p>)}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Story</label>
        <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={3} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {fieldErrors.categoryId?.map((m) => <p key={m} className="mt-1 text-sm text-red-600">{m}</p>)}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Collections</label>
        <select
          multiple
          value={collectionIds}
          onChange={(e) => setCollectionIds(Array.from(e.target.selectedOptions, (o) => o.value))}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Tags (comma-separated)</label>
        <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Availability</label>
        <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {AVAILABILITY_OPTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={forSale} onChange={(e) => setForSale(e.target.checked)} id="forSale" />
        <label htmlFor="forSale" className="text-sm font-medium">For sale</label>
      </div>

      {forSale && (
        <div>
          <label className="mb-1 block text-sm font-medium">Price</label>
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          {fieldErrors.price?.map((m) => <p key={m} className="mt-1 text-sm text-red-600">{m}</p>)}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} id="featured" />
        <label htmlFor="featured" className="text-sm font-medium">Featured</label>
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button type="submit" disabled={isSubmitting} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {isSubmitting ? "Saving…" : artwork ? "Save changes" : "Create artwork"}
      </button>
    </form>
  );
}