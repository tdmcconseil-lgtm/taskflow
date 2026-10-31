import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { PricingTable } from "@/components/PricingTable";
import { buttonClass } from "@/components/Button";

// Page de garde publique (vitrine). Un visiteur connecté voit « Ouvrir mon
// espace » au lieu des appels à l'inscription (cf. cahier des charges).
// Structure : en-tête collant, hero, bandeau confiance, avantages, offres,
// FAQ, appel final, pied de page.
export default async function Home() {
  const session = await getSession();
  const isAuthed = session !== null;
  const t = await getDictionary();

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
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* En-tête collant */}
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
            {!isAuthed && (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.landing.heroNoCard}</p>
            )}
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
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
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

        {/* Offres */}
        <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
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
        <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
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
          <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
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
          </div>
        </div>
      </footer>
    </div>
  );
}
