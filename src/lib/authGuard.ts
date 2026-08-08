import { auth } from "@/lib/auth";

export interface AuthenticatedArtist {
  id: string;
  email: string;
}

/**
 * Reusable Server Action authentication guard (Task 2.3.3).
 *
 * Every Studio Server Action — in this Epic and every future one —
 * must call this FIRST, before validating input or calling a Service.
 *
 * Usage:
 *
 *   const artist = await requireArtistSession();
 *   if (!artist) {
 *     return { success: false, error: { message: "Unauthorized." } };
 *   }
 *   // ...validate input, then call the Service
 */
export async function requireArtistSession(): Promise<AuthenticatedArtist | null> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return { id: session.user.id, email: session.user.email };
}