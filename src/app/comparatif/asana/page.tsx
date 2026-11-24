import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { buttonClass } from "@/components/Button";
import { buildPageMetadata, buildUrl } from "@/lib/seo/urls";

// Page comparative publique « getRIDA vs Asana » (acquisition SEO). Contenu
// localisé (namespace `comparatif.asana`), metadata via le helper SEO unique,
// route déclarée dans PUBLIC_ROUTES → présente dans le sitemap.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  return buildPageMetadata({ path: "/comparatif/asana", locale, seo: t.seo.pages.comparatifAsana });
}

// Pastille « avantage » : indigo = getRIDA, ambre = Asana, neutre = égalité.
function AdvantageChip({ adv, equalLabel }: { adv: string; equalLabel: string }) {
  if (adv === "g") {
    return (
      <span className="inline-block whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
        getRIDA
      </span>
    );
  }
  if (adv === "r") {
    return (
      <span className="inline-block whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        Asana
      </span>
    );
  }
  return (
    <span className="inline-block whitespace-nowrap rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {equalLabel}
    </span>
  );
}

export default async function ComparatifAsana() {
  const user = await getCurrentUser();
  const isAuthed = user !== null;
  const t = await getDictionary();
  const c = t.comparatif.asana;

  // JSON-LD FAQPage : les questions/réponses peuvent ressortir en rich results.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

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
            <div className="mb-5 flex items-center gap-3">
              <span className="text-xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400">getRIDA</span>
              <span className="text-xs font-semibold tracking-widest text-zinc-400">VS</span>
              <span className="text-xl font-semibold tracking-tight">Asana</span>
            </div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {c.eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {c.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">{c.heroSub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className={buttonClass("primary", "md", "px-5 py-2.5 text-base")}>
                {c.ctaTry}
              </Link>
              <a href="#tableau" className={buttonClass("secondary", "md", "px-5 py-2.5 text-base")}>
                {c.ctaSee}
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              {c.trust.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Intro */}
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">{c.intro}</p>
        </section>

        {/* Tableau comparatif */}
        <section id="tableau" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {c.tableEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{c.tableTitle}</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-white text-left dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 font-semibold">{c.colCriterion}</th>
                  <th className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">getRIDA</th>
                  <th className="px-4 py-3 font-semibold">Asana</th>
                  <th className="px-4 py-3 font-semibold">{c.colAdvantage}</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((row) => (
                  <tr key={row.label} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
                    <th scope="row" className="px-4 py-3 text-left align-top font-semibold">
                      {row.label}
                    </th>
                    <td className="bg-indigo-50/50 px-4 py-3 align-top text-zinc-700 dark:bg-indigo-950/20 dark:text-zinc-300">
                      {row.getrida}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-400">{row.asana}</td>
                    <td className="px-4 py-3 align-top">
                      <AdvantageChip adv={row.adv} equalLabel={c.advEqual} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Choisir X si… */}
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="font-semibold">
                {c.pickAsanaTitle} <span className="text-sm font-normal text-zinc-400">{c.pickIf}</span>
              </h3>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                {c.pickAsana.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-zinc-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-white p-6 dark:border-indigo-900 dark:bg-zinc-900">
              <h3 className="font-semibold">
                {c.pickGetridaTitle} <span className="text-sm font-normal text-zinc-400">{c.pickIf}</span>
              </h3>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                {c.pickGetrida.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {c.faqEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{c.faqTitle}</h2>
          <div className="mt-6 divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {c.faq.map((f) => (
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
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-6 py-12 text-center dark:border-indigo-900 dark:bg-indigo-950/30">
            <h2 className="text-2xl font-semibold tracking-tight">{c.finalTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-300">{c.finalSub}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className={buttonClass("primary", "md", "px-5 py-2.5 text-base")}>
                {c.finalCtaCreate}
              </Link>
              <Link href="/" className={buttonClass("secondary", "md", "px-5 py-2.5 text-base")}>
                {c.finalCtaDiscover}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-zinc-400">
          <span>{t.landing.footerTagline}</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-600">{c.footnote}</span>
        </div>
      </footer>
    </div>
  );
}
