"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { buttonClass } from "@/components/Button";

// Grille tarifaire de la page d'accueil. Tarif plat mensuel par utilisateur
// (pas d'offre annuelle).
const MONTHLY = { free: 0, pro: 3, business: 6 } as const;

export function PricingTable() {
  const t = useT();

  // Montant mensuel affiché pour un plan (Free reste « 0 € »).
  function amount(plan: keyof typeof MONTHLY): string {
    const m = MONTHLY[plan];
    if (m === 0) return t.landing.freePrice;
    return `${m} €`;
  }
  const suffix = (plan: keyof typeof MONTHLY) =>
    MONTHLY[plan] === 0 ? "" : t.landing.perMonth;

  const plans = [
    {
      key: "free" as const,
      name: t.landing.planFree,
      seats: t.landing.freeSeats,
      storage: t.landing.freeStorage,
      spec: t.landing.freeSpec,
      cta: t.landing.freeCta,
      href: "/signup?plan=free",
      featured: false,
    },
    {
      key: "pro" as const,
      name: t.landing.planPro,
      seats: t.landing.proSeats,
      storage: t.landing.proStorage,
      spec: t.landing.proSpec,
      cta: t.landing.proCta,
      href: "/signup?plan=pro",
      featured: true,
    },
    {
      key: "business" as const,
      name: t.landing.planBusiness,
      seats: t.landing.businessSeats,
      storage: t.landing.businessStorage,
      spec: t.landing.businessSpec,
      cta: t.landing.businessCta,
      href: "mailto:contact@getrida.com",
      featured: false,
    },
  ];

  return (
    <div>
      {/* Cartes d'offres */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.key}
            className={`flex flex-col rounded-2xl border p-6 ${
              p.featured
                ? "border-indigo-400 bg-white shadow-md ring-1 ring-indigo-200 dark:border-indigo-600 dark:bg-zinc-900 dark:ring-indigo-900"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.featured && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  ★
                </span>
              )}
            </div>

            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">{amount(p.key)}</span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{suffix(p.key)}</span>
            </div>

            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-zinc-500 dark:text-zinc-400">{t.landing.rowSeats}</span>
                <span className="text-right font-medium">{p.seats}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-zinc-500 dark:text-zinc-400">{t.landing.rowStorage}</span>
                <span className="text-right font-medium">{p.storage}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-zinc-500 dark:text-zinc-400">{t.landing.rowSpecifics}</span>
                <span className="text-right font-medium">{p.spec}</span>
              </li>
            </ul>

            <Link
              href={p.href}
              className={`mt-6 w-full ${buttonClass(p.featured ? "primary" : "secondary", "md", "justify-center py-2")}`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {t.landing.offersFootnote}
      </p>
    </div>
  );
}
