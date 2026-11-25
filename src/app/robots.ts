import type { MetadataRoute } from "next";
import { APP_URL, buildUrl } from "@/lib/seo/urls";

// robots.txt généré. Public indexable ; tout l'espace connecté et les API sont
// interdits au crawl (y compris /app/superadmin, couvert par /app/).
// URLs construites via le helper SEO unique (B-ready).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app/", // tout l'espace connecté, dont /app/superadmin
        "/api/", // routes techniques
        "/profile/", // confirmation d'email, pages de compte
        "/reset-password/", // jetons de réinitialisation
        "/invitations/", // jetons d'invitation
        "/logout", // action de déconnexion
      ],
    },
    sitemap: buildUrl("/sitemap.xml"),
    host: APP_URL,
  };
}
