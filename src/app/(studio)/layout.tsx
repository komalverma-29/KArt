import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Defense in depth (Task 2.3.2): middleware already protects /studio/*,
 * but this layout independently re-verifies the session server-side
 * before any Studio page renders.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <>{children}</>;
}