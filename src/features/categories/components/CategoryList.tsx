"use client";

import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import {
  archiveCategoryAction,
  restoreCategoryAction,
  deleteCategoryAction,
} from "@/features/categories/actions/categoryLifecycleActions";

interface CategoryRow {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  _count: { artworks: number };
  createdAt: Date;
  updatedAt: Date;
}

export function CategoryList({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();

  if (categories.length === 0) {
    return <p className="text-sm text-neutral-500">No categories yet. Create your first category above.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-neutral-500">
          <th className="py-2">Name</th>
          <th className="py-2">Artworks</th>
          <th className="py-2">Status</th>
          <th className="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <tr key={category.id} className="border-b">
            <td className="py-2">{category.name}</td>
            <td className="py-2">{category._count.artworks}</td>
            <td className="py-2">{category.status}</td>
            <td className="flex gap-3 py-2">
              {category.status === "ACTIVE" ? (
                <ConfirmDialog
                  trigger={<button className="text-neutral-600 underline">Archive</button>}
                  title="Archive category"
                  description="Archived categories can't be assigned to new artwork, but existing artwork keeps it."
                  confirmLabel="Archive"
                  onConfirm={async () => {
                    await archiveCategoryAction({ id: category.id });
                    router.refresh();
                  }}
                />
              ) : (
                <ConfirmDialog
                  trigger={<button className="text-neutral-600 underline">Restore</button>}
                  title="Restore category"
                  description="This category will become available for artwork assignment again."
                  confirmLabel="Restore"
                  onConfirm={async () => {
                    await restoreCategoryAction({ id: category.id });
                    router.refresh();
                  }}
                />
              )}
              <ConfirmDialog
                trigger={<button className="text-red-600 underline">Delete</button>}
                title="Delete category"
                description="This can't be undone if artwork is assigned, deletion will be blocked."
                confirmLabel="Delete"
                destructive
                onConfirm={async () => {
                  await deleteCategoryAction({ id: category.id });
                  router.refresh();
                }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}