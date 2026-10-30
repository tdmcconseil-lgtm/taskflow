import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Next.js 16 : le middleware s'appelle désormais « proxy ».
// Contrôle optimiste de session (signature du cookie) — la vérification réelle
// (existence de l'utilisateur) se fait dans les pages/actions via le DAL.

const COOKIE_NAME = "tf_session";

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret());
      valid = true;
    } catch {
      valid = false;
    }
  }

  const { pathname } = request.nextUrl;
  const isApp = pathname.startsWith("/app");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isApp && !valid) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthPage && valid) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // Transmet le chemin courant aux composants serveur (barre latérale).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
