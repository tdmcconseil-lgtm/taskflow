import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, buildUrl } from "@/lib/seo/urls";

// Rendu à la requête (et non prérendu au build) : APP_URL n'est injecté qu'au
// runtime (docker-compose), pas au build Docker. Sans ceci, cette route est
// mise en cache statique et fige le fallback localhost au lieu de getrida.com.
export const dynamic = "force-dynamic";

// sitemap.xml généré depuis la liste UNIQUE des pages publiques (PUBLIC_ROUTES).
// Voie A : une entrée par URL (pas par langue — getRIDA sert la même URL dans
// les 5 langues). Voie B : itérer sur `locales` pour produire une entrée par
// langue + `alternates.languages` — ne touchera que ce fichier et `buildUrl`.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.filter((route) => route.inSitemap).map((route) => ({
    url: buildUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
