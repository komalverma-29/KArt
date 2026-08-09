"use client";

import { useState, type FormEvent } from "react";
import { createCategoryAction } from "@/features/categories/actions/createCategoryAction";
import { updateCategoryAction } from "@/features/categories/actions/updateCategoryAction";

interface CategoryFormProps {
  category?: { id: string; name: string; description: string | null };
  onSaved: () => void;
}

export function CategoryForm({ category, onSaved }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const result = category
      ? await updateCategoryAction({ id: category.id, name, description })
      : await createCategoryAction({ name, description });

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error.message);
      if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
      return;
    }

    if (!category) {
      setName("");
      setDescription("");
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {fieldErrors.name?.map((m) => <p key={m} className="mt-1 text-sm text-red-600">{m}</p>)}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          rows={3}
        />
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : category ? "Save changes" : "Create category"}
      </button>
    </form>
  );
}