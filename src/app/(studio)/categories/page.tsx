import { CategoryService } from "@/services/category/CategoryService";
import { CategoryList } from "@/features/categories/components/CategoryList";
import { CategoryFormClientWrapper } from "@/features/categories/components/CategoryFormClientWrapper";

export default async function CategoriesPage() {
  const categories = await CategoryService.list();

  return (
    <main>
      <h1>Categories</h1>

      <section className="mb-10 rounded-lg border border-neutral-200 p-6">
        <h2 className="mb-4 text-lg font-medium">New category</h2>
        <CategoryFormClientWrapper />
      </section>

      <CategoryList categories={categories} />
    </main>
  );
}