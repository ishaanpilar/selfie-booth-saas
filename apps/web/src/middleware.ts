import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/invite", "/offline", "/booth"];

/**
 * Edge-safe gate: only checks for the *presence* of a valid-looking session
 * cookie (no DB round trip is possible in middleware). Full session/role
 * validation happens server-side in `requireActiveOrg()` — this layer just
 * avoids shipping the admin shell's JS bundle to a signed-out visitor.
 * `/booth` is intentionally public: kiosks authenticate via a device/booth
 * token, not a user session.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path)) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie && pathname.startsWith("/admin")) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)"],
};
