"use client";

import { useRouter } from "next/navigation";
import { CategoryForm } from "./CategoryForm";

export function CategoryFormClientWrapper() {
  const router = useRouter();

  return <CategoryForm onSaved={() => router.refresh()} />;
}