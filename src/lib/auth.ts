import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { AuthService } from "@/services/auth/AuthService";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials provider requires JWT sessions (no database session
  // table is introduced — design.md keeps the schema minimal).
  session: {
    strategy: "jwt",
    // FR-AUTH-003 — session inactivity expiry.
    // JWT sessions have no server-side "last active" record, so this
    // is an approximation: the token is valid for `maxAge` from
    // issuance, and is silently reissued (extending validity) at most
    // once per `updateAge` while the artist is actively using the
    // Studio. This is the standard Auth.js pattern for approximating
    // inactivity-based expiry without a sessions table.
    maxAge: 60 * 30, // 30 minutes
    updateAge: 60 * 5, // refresh at most every 5 minutes of activity
  },

  pages: {
    signIn: "/login",
  },

  // Required by Auth.js v5 when the deployment host isn't statically
  // known (e.g. behind a proxy, or in local dev on a non-default port).
  trustHost: true,

  // Auth.js applies HttpOnly + SameSite=Lax by default; this makes the
  // Secure flag explicit and environment-driven rather than relying on
  // implicit URL-scheme detection.
  useSecureCookies: process.env.NODE_ENV === "production",

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        // AuthService.validateCredentials never reveals whether the
        // email exists — it simply returns null on any failure.
        const artist = await AuthService.validateCredentials(email, password);

        if (!artist) {
          return null;
        }

        return {
          id: artist.id,
          email: artist.email,
          name: artist.fullName,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});