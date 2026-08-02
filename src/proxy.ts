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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.*\\.png).*)"],
};
