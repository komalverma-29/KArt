import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Route groups like (studio) do not affect the URL — the actual path
// is /studio/*, which is what the matcher below targets. This never
// touches public routes, auth pages, or the NextAuth API route.
export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isStudioRoute = req.nextUrl.pathname.startsWith("/studio");

  if (isStudioRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/studio/:path*"],
};