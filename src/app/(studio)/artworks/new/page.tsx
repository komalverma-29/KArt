import { CategoryService } from "@/services/category/CategoryService";
import { CollectionService } from "@/services/collection/CollectionService";
import { NewArtworkClient } from "./NewArtworkClient";

export default async function NewArtworkPage() {
  const categories = await CategoryService.list("ACTIVE");
  const collections = await CollectionService.list();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New artwork</h1>
      <NewArtworkClient categories={categories} collections={collections} />
    </main>
  );
}