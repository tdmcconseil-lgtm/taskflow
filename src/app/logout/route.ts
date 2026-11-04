import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Déconnexion par GET : efface le cookie de session puis renvoie vers `next`
// (défaut /login). Sert notamment quand un cookie signé reste valide mais que le
// compte n'existe plus (ex. base purgée) : requireUser() y renvoie pour NETTOYER
// le cookie. Sans ça, le proxy optimiste (signature seule) reboucle /app ↔ /login.
// Hors du matcher du proxy (/app, /login, /signup) : aucun contrôle ne s'y applique.
const COOKIE_NAME = "tf_session";

export function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  // On n'accepte qu'un chemin interne absolu (pas d'URL externe « //evil.com »).
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/login";
  // Redirection RELATIVE (et non new URL(target, request.url)) : derrière Caddy,
  // request.url pointe sur l'origine INTERNE (localhost:3001) et enverrait le
  // navigateur sur localhost. Une Location relative est résolue par le navigateur
  // contre l'URL publique qu'il a demandée (getrida.com). On efface le cookie au passage.
  const res = new NextResponse(null, { status: 307, headers: { Location: target } });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
