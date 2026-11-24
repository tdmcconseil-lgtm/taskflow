import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { buttonClass } from "@/components/Button";
import { buildPageMetadata } from "@/lib/seo/urls";

// Page comparateur UNIQUE (`/comparatif`) : un seul tableau getRIDA vs tous les
// concurrents côte à côte. Réutilise entièrement les données existantes
// (`comparatif.shared` + `comparatif.apps`) ; chaque en-tête de colonne renvoie
// à la page détaillée `/comparatif/<slug>`. Route publique → sitemap.

// Ordre des colonnes concurrentes (slugs = clés de `comparatif.apps`).
const APPS = ["asana", "monday", "trello", "notion", "clickup"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  return buildPageMetadata({ path: "/comparatif", locale, seo: t.seo.pages.comparateur });
}

export default async function ComparateurPage() {
  const user = await getCurrentUser();
  const isAuthed = user !== null;
  const t = await getDictionary();
  const s = t.comparatif.shared;
  const o = t.comparatif.overview;

  // Colonnes concurrentes, dans l'ordre défini.
  const columns = APPS.map((slug) => ({ slug, app: t.comparatif.apps[slug] }));

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* En-tête collant (même trame que l'accueil) */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
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
              <Link href="/signup" className={buttonClass("primary", "md")}>
                {t.landing.signUp}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {s.eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {o.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">{o.heroSub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className={buttonClass("primary", "md", "px-5 py-2.5 text-base")}>
                {s.ctaTry}
              </Link>
              <a href="#tableau" className={buttonClass("secondary", "md", "px-5 py-2.5 text-base")}>
                {s.ctaSee}
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              {s.trust.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Intro */}
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">{o.intro}</p>
        </section>

        {/* Tableau comparateur multi-colonnes */}
        <section id="tableau" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {s.tableEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{o.tableTitle}</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[1040px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-white text-left align-bottom dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="w-44 px-4 py-3 font-semibold">{s.colCriterion}</th>
                  <th className="w-48 bg-indigo-50/60 px-4 py-3 font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                    getRIDA
                  </th>
                  {columns.map(({ slug, app }) => (
                    <th key={slug} className="w-44 px-4 py-3 font-semibold">
                      <Link
                        href={`/comparatif/${slug}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {app.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.map((row) => {
                  const cells = columns.map(({ slug, app }) => {
                    const appCells = app.cells as Record<string, string>;
                    const appAdv = app.adv as Record<string, string>;
                    return { slug, value: appCells[row.key], rivalWins: appAdv[row.key] === "r" };
                  });
                  return (
                    <tr key={row.key} className="border-b border-zinc-200 align-top last:border-0 dark:border-zinc-800">
                      <th scope="row" className="px-4 py-3 text-left font-semibold">
                        {row.label}
                      </th>
                      <td className="bg-indigo-50/40 px-4 py-3 text-zinc-700 dark:bg-indigo-950/20 dark:text-zinc-200">
                        {row.getrida}
                      </td>
                      {cells.map(({ slug, value, rivalWins }) => (
                        <td key={slug} className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="flex gap-1.5">
                            {rivalWins && (
                              <span
                                aria-hidden
                                title={o.advLegend}
                                className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-amber-500"
                              />
                            )}
                            <span>{value}</span>
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {o.advLegend}
            </span>
          </div>
        </section>

        {/* Pourquoi getRIDA (réutilise la liste partagée) */}
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-indigo-200 bg-white p-6 dark:border-indigo-900 dark:bg-zinc-900">
            <h3 className="font-semibold">
              {s.pickGetridaTitle} <span className="text-sm font-normal text-zinc-400">{s.pickIf}</span>
            </h3>
            <ul className="mt-4 grid grid-cols-1 gap-3 text-sm text-zinc-600 sm:grid-cols-2 dark:text-zinc-400">
              {s.pickGetrida.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Appel final */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-6 py-12 text-center dark:border-indigo-900 dark:bg-indigo-950/30">
            <h2 className="text-2xl font-semibold tracking-tight">{s.finalTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-300">{s.finalSub}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className={buttonClass("primary", "md", "px-5 py-2.5 text-base")}>
                {s.finalCtaCreate}
              </Link>
              <Link href="/" className={buttonClass("secondary", "md", "px-5 py-2.5 text-base")}>
                {s.finalCtaDiscover}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-zinc-400">
          <span>{t.landing.footerTagline}</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-600">{o.footnote}</span>
        </div>
      </footer>
    </div>
  );
}
