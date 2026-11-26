// Fondations SEO — point UNIQUE de construction des URLs et des metadata des
// pages publiques. Tout (canonical, openGraph.url, entrées sitemap, host /
// sitemap de robots) passe par ici : aucune URL concaténée « en dur » ailleurs.
//
// ⚠️ B-READY (voie A aujourd'hui) : getRIDA sert la MÊME URL dans les 5 langues
// (langue choisie par cookie `tf_lang` / Accept-Language, PAS par l'URL). Donc
// pas de préfixe de langue, pas d'`alternates.languages`, pas de hreflang.
// Pour passer à la voie B (routing par langue `/fr /en …` + hreflang) il ne
// faudra toucher QUE :
//   1. `buildUrl` ci-dessous (préfixer `/<locale>` quand `locale` est fourni) ;
//   2. la boucle sur `locales` dans `sitemap.ts` (une entrée par langue) ;
//   3. `alternates.languages` + x-default dans `buildPageMetadata`.
// Voir la section « Reste à faire pour B » de la PR + l'impact `src/proxy.ts`.

import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

// Base absolue du site. Même source que le reste de l'app (password-reset,
// stripe, workspaces, notify-dispatch) : prod = https://getrida.com,
// dev = http://localhost:3001. Sans slash final.
export const APP_URL = (process.env.APP_URL ?? "http://localhost:3001").replace(
  /\/+$/,
  "",
);

/**
 * Construit une URL absolue pour un chemin public.
 *
 * Voie A : `locale` est IGNORÉ (une seule URL par page, toutes langues
 * confondues). Le paramètre existe déjà pour que la voie B n'ait qu'à préfixer
 * `/<locale>` ici — sans changer aucun appelant.
 */
export function buildUrl(path: string, _locale?: Locale): string {
  // En voie B : const prefix = _locale ? `/${_locale}` : "";
  const prefix = "";
  const normalized = path === "/" ? "" : `/${path.replace(/^\/+/, "")}`;
  return `${APP_URL}${prefix}${normalized}` || `${APP_URL}/`;
}

/** Mappe une locale interne vers un code OpenGraph (`og:locale`). */
export function ogLocale(locale: Locale): string {
  const map: Record<Locale, string> = {
    fr: "fr_FR",
    en: "en_US",
    es: "es_ES",
    de: "de_DE",
    it: "it_IT",
  };
  return map[locale];
}

// Fréquence de changement des pages publiques pour le sitemap.
type ChangeFrequency = NonNullable<
  import("next").MetadataRoute.Sitemap[number]["changeFrequency"]
>;

/** Une page publique indexable, décrite une seule fois et consommée partout. */
export type PublicRoute = {
  /** Chemin sans préfixe de langue (voie A). */
  path: string;
  /** Clé de la table `t.seo` portant { title, description } de la page. */
  seoKey: keyof Dictionary["seo"]["pages"];
  changeFrequency: ChangeFrequency;
  priority: number;
  /** Présence dans sitemap.xml. L'accueil prime ; login/signup secondaires. */
  inSitemap: boolean;
};

// Liste UNIQUE des pages publiques. `sitemap.ts` et generateMetadata la
// consomment. En voie B, on multipliera chaque entrée par `locales`.
export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: "/", seoKey: "home", changeFrequency: "weekly", priority: 1, inSitemap: true },
  // Le comparatif est désormais INTÉGRÉ à l'accueil (section #comparatif) : plus
  // de route `/comparatif` ni de fiches `/comparatif/<app>` → retirées du
  // sitemap. Pas de redirection 301 (site encore non indexé). Les clés de dict
  // `t.comparatif.*` / `seo.pages.comparateur` restent (servies par le tableau).
  { path: "/login", seoKey: "login", changeFrequency: "monthly", priority: 0.3, inSitemap: true },
  { path: "/signup", seoKey: "signup", changeFrequency: "monthly", priority: 0.5, inSitemap: true },
] as const;

/**
 * Fabrique les metadata d'une page publique à partir de `(path, locale)` et du
 * dictionnaire. Appelée par les `generateMetadata` des pages.
 *
 * Voie A : pas d'`alternates.languages`. En voie B, ajouter ici :
 *   alternates: { canonical: url, languages: { fr: buildUrl(path,'fr'), … , 'x-default': … } }
 */
export function buildPageMetadata(opts: {
  path: string;
  locale: Locale;
  seo: { title: string; description: string };
}): Metadata {
  const { path, locale, seo } = opts;
  const url = buildUrl(path, locale);
  return {
    // `absolute` : le titre est déjà complet (marque incluse) → le template
    // "%s — getRIDA" du layout ne doit PAS lui ajouter de suffixe.
    title: { absolute: seo.title },
    description: seo.description,
    alternates: {
      canonical: url,
      // Voie B : languages: { … }, puis 'x-default'.
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
      siteName: "getRIDA",
      type: "website",
      locale: ogLocale(locale),
      // Les images (1200×630) sont fournies par la convention de fichier
      // `src/app/opengraph-image.tsx` (og:image + twitter:image via le repli
      // Next). Rien à référencer en dur ici.
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  };
}
