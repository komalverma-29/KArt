import type { DefaultSession } from "next-auth";

// Extends the default Auth.js Session type so `session.user.id` is
// typed (Artist.id), matching what the jwt/session callbacks in
// src/lib/auth.ts actually populate.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}