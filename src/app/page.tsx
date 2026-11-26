import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { PricingTable } from "@/components/PricingTable";
import { ComparateurTable } from "@/components/ComparateurTable";
import { LandingSubNav } from "@/components/LandingSubNav";
import { buttonClass } from "@/components/Button";
import { buildPageMetadata, buildUrl } from "@/lib/seo/urls";
import { FREE_SEATS } from "@/lib/plans";

// Ordre des colonnes concurrentes du comparateur (slugs = clés de
// `t.comparatif.apps`). getRIDA est toujours la 1re colonne (figée).
const COMPARE_APPS = ["asana", "monday", "trello", "notion", "clickup"] as const;

// Metadata localisée de l'accueil (titre descriptif, description 120–155 car.,
// openGraph, twitter, canonical) — construite via le helper SEO unique.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  return buildPageMetadata({ path: "/", locale, seo: t.seo.pages.home });
}

// Page de garde publique (vitrine). Un visiteur connecté voit « Ouvrir mon
// espace » au lieu des appels à l'inscription (cf. cahier des charges).
// Structure : en-tête collant, hero, bandeau confiance, avantages, offres,
// FAQ, appel final, pied de page.
export default async function Home() {
  // On décide « connecté » sur l'EXISTENCE réelle du compte (requête DB), pas sur
  // la simple présence du cookie : un cookie resté valide mais dont le compte
  // n'existe plus (ex. après purge de la base) afficherait sinon la vue connectée
  // et masquerait « Se connecter / S'inscrire ».
  const user = await getCurrentUser();
  const isAuthed = user !== null;
  const t = await getDictionary();
  // Hash du commit déployé (injecté dans l'image au build). Affiché discrètement
  // dans le pied de page ; absent en local, donc rien ne s'affiche en dev.
  const buildSha = process.env.BUILD_SHA;

  const advantages = [
    { title: t.landing.advFloorTitle, desc: t.landing.advFloorDesc },
    { title: t.landing.advSovTitle, desc: t.landing.advSovDesc },
    { title: t.landing.advSimpleTitle, desc: t.landing.advSimpleDesc },
    { title: t.landing.advMultiTitle, desc: t.landing.advMultiDesc },
  ];

  const faqs = [
    { q: t.landing.faq1Q, a: t.landing.faq1A },
    { q: t.landing.faq2Q, a: t.landing.faq2A },
    { q: t.landing.faq3Q, a: t.landing.faq3A },
    { q: t.landing.faq4Q, a: t.landing.faq4A },
    // Franchise de sièges gratuits : le nombre vient de plans.ts (FREE_SEATS),
    // jamais recopié en dur dans la copie.
    { q: t.landing.faq5Q, a: t.landing.faq5A.replace("{free}", String(FREE_SEATS)) },
  ];

  // Comparateur intégré à l'accueil (section #comparatif). Mêmes données que
  // l'ancienne route `/comparatif` : `t.comparatif.shared` (côté getRIDA +
  // critères) et `t.comparatif.apps[*]` (valeurs concurrentes). Sérialisées
  // pour le composant client partagé `ComparateurTable`.
  const cmp = t.comparatif.shared;
  const cmpOverview = t.comparatif.overview;
  const compareApps = Object.fromEntries(
    COMPARE_APPS.map((slug) => {
      const app = t.comparatif.apps[slug];
      return [slug, { name: app.name, cells: app.cells, adv: app.adv }];
    }),
  );

  // Sous-navigation collante par thèmes (scroll-spy côté client).
  const navItems = [
    { id: "avantages", label: t.landing.nav.advantages },
    { id: "comparatif", label: t.landing.nav.comparatif },
    { id: "tarifs", label: t.landing.nav.pricing },
    { id: "faq", label: t.landing.nav.faq },
  ];

  // Données structurées (JSON-LD) : aide les moteurs à comprendre le produit et
  // l'éditeur. URLs via le helper SEO unique.
  const homeUrl = buildUrl("/");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: t.common.appName,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: homeUrl,
        description: t.seo.pages.home.description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      },
      {
        "@type": "Organization",
        name: t.common.appName,
        url: homeUrl,
      },
    ],
  };

  return (
    // `overflow-y-auto` + `h-full` : l'accueil défile DANS ce conteneur (et non
    // sur le document). Indispensable pour que l'en-tête + la sous-nav restent
    // réellement collants : `<body>` a une hauteur fixe (globals `height:100%`),
    // donc un simple `position: sticky` accroché au document se décrocherait au
    // bout d'un écran. Le scroll interne rend le `sticky top-0` fiable, et le
    // `scroll-mt-*` des sections compense la hauteur en-tête + sous-nav.
    <div className="flex h-full flex-1 flex-col overflow-y-auto scroll-smooth motion-reduce:scroll-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* En-tête + sous-nav collants (un seul conteneur sticky : la sous-nav
          reste accrochée juste sous l'en-tête quand on défile). */}
      <div className="sticky top-0 z-20">
        <header className="border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              {t.common.appName}
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <LocaleSwitcher />
              {isAuthed ? (
                <Link href="/app" className={buttonClass("primary", "md")}>
                  {t.landing.openApp}
                </Link>
              ) : (
                <>
                  <Link href="/login" className="hidden text-sm font-medium text-zinc-600 hover:text-zinc-900 sm:inline dark:text-zinc-300 dark:hover:text-white">
                    {t.landing.signIn}
                  </Link>
                  <Link href="/signup" className={buttonClass("primary", "md")}>
                    {t.landing.signUp}
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <LandingSubNav items={navItems} />
      </div>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {t.landing.heroTitle}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
              {t.landing.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isAuthed ? (
                <Link href="/app" className={buttonClass("primary", "md", "px-5 py-2.5 text-base")}>
                  {t.landing.openApp}
                </Link>
              ) : (
                <>
                  <Link href="/signup" className={buttonClass("primary", "md", "px-5 py-2.5 text-base")}>
                    {t.landing.heroPrimary}
                  </Link>
                  <Link href="/login" className={buttonClass("secondary", "md", "px-5 py-2.5 text-base")}>
                    {t.landing.signIn}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Bandeau confiance */}
          <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{t.landing.trustEu}</span>
            <span aria-hidden className="text-zinc-300 dark:text-zinc-700">·</span>
            <span>{t.landing.trustLangs}</span>
            <span aria-hidden className="text-zinc-300 dark:text-zinc-700">·</span>
            <span>{t.landing.trustStorage}</span>
          </div>
        </section>

        {/* Avantages */}
        <section id="avantages" className="mx-auto w-full max-w-6xl scroll-mt-28 px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            {t.landing.advantagesTitle}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {advantages.map((a) => (
              <div
                key={a.title}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparatif intégré (ancien `/comparatif`, désormais sur l'accueil) :
            courte intro + tableau interactif complet (sélecteur conservé). */}
        <section id="comparatif" className="mx-auto w-full max-w-6xl scroll-mt-28 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {cmp.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{cmpOverview.tableTitle}</h2>
            <p className="mx-auto mt-3 text-zinc-600 dark:text-zinc-400">{cmpOverview.heroSub}</p>
          </div>
          <div className="mt-10">
            <ComparateurTable
              rows={cmp.rows.map((row) => ({ key: row.key, label: row.label, getrida: row.getrida }))}
              apps={compareApps}
              order={[...COMPARE_APPS]}
              labels={{
                getrida: "getRIDA",
                criterion: cmp.colCriterion,
                selectorLabel: cmpOverview.selector.label,
                slot2: cmpOverview.selector.slot2,
                slot3: cmpOverview.selector.slot3,
                winBadge: cmpOverview.winBadge,
                winLegend: cmpOverview.winLegend,
              }}
            />
          </div>
        </section>

        {/* Offres / Tarifs */}
        <section id="tarifs" className="mx-auto w-full max-w-5xl scroll-mt-28 px-4 py-14 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">{t.landing.offersTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
              {t.landing.offersSubtitle}
            </p>
          </div>
          <div className="mt-10">
            <PricingTable />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-28 px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">{t.landing.faqTitle}</h2>
          <div className="mt-8 divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {faqs.map((f) => (
              <details key={f.q} className="group bg-white dark:bg-zinc-900">
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 font-medium">
                  {f.q}
                  <span aria-hidden className="text-zinc-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-zinc-500 dark:text-zinc-400">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Appel final */}
        {!isAuthed && (
          <section id="commencer" className="mx-auto w-full max-w-6xl scroll-mt-28 px-4 py-14 sm:px-6">
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-6 py-12 text-center dark:border-indigo-900 dark:bg-indigo-950/30">
              <h2 className="text-2xl font-semibold tracking-tight">{t.landing.finalTitle}</h2>
              <p className="mt-3 text-zinc-600 dark:text-zinc-300">{t.landing.finalSubtitle}</p>
              <Link
                href="/signup"
                className={`mt-6 inline-flex ${buttonClass("primary", "md", "px-5 py-2.5 text-base")}`}
              >
                {t.landing.finalCta}
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* Pied de page */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-semibold tracking-tight">{t.common.appName}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.landing.footerTagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            <Link
              href={isAuthed ? "/app" : "/login"}
              className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            >
              {isAuthed ? t.landing.openApp : t.landing.signIn}
            </Link>
            <a href="#comparatif" className="hover:text-zinc-900 dark:hover:text-white">
              {t.landing.footerCompare}
            </a>
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white">
              {t.landing.footerLegal}
            </Link>
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white">
              {t.landing.footerTerms}
            </Link>
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white">
              {t.landing.footerPrivacy}
            </Link>
            <span>
              © {new Date().getFullYear()} {t.common.appName}
            </span>
            {buildSha && (
              <span
                className="font-mono text-xs text-zinc-400 dark:text-zinc-600"
                title="Version déployée"
              >
                {buildSha}
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
