import { CategoryService } from "@/services/category/CategoryService";
import { CategoryList } from "@/features/categories/components/CategoryList";
import { CategoryForm } from "@/features/categories/components/CategoryForm";

export default async function CategoriesPage() {
  const categories = await CategoryService.list();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Categories</h1>

      <section className="mb-10 rounded-lg border border-neutral-200 p-6">
        <h2 className="mb-4 text-lg font-medium">New category</h2>
        {/* Client wrapper handles its own refresh via router.refresh() */}
        <CategoryFormClientWrapper />
      </section>

      <CategoryList categories={categories} />
    </main>
  );
}

// Server Components can't hold client state; this tiny wrapper lets
// CategoryForm live as a client island without making the whole page client.
function CategoryFormClientWrapper() {
  "use client";
  const { useRouter } = require("next/navigation");
  const router = useRouter();
  return <CategoryForm onSaved={() => router.refresh()} />;
}