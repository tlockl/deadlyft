import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Optimistic route gating only: this reads the cookie and never touches the
// database, because it runs on every request including prefetches. The real
// authorization check lives in src/lib/dal.ts.
const PUBLIC_ROUTES = ["/login", "/register"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next's internals and static assets.
  //
  // The extension check matters: icons and the manifest have to be reachable
  // while signed out. iOS fetches the apple-touch-icon when you add the app to
  // the home screen, and redirecting that request to /login hands it an HTML
  // document instead of an image. Matching on the extension rather than naming
  // each file also means a new icon can't silently regress this.
  matcher: [
    "/((?!_next/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest)$).*)",
  ],
};
