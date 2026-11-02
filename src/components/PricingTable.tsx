"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { buttonClass } from "@/components/Button";
import {
  PLANS,
  PLAN_DEFS,
  formatPrice,
  formatStorageMb,
  type WorkspacePlan,
} from "@/lib/plans";

// Grille tarifaire de la page d'accueil. Les CHIFFRES (prix, sièges, stockage)
// dérivent de PLAN_DEFS (source de vérité unique) ; les dictionnaires ne portent
// plus que les mots (nom de l'offre, spécificités, bouton). Mensuel à l'usage,
// pas d'offre annuelle.
export function PricingTable() {
  const t = useT();

  const meta: Record<
    WorkspacePlan,
    { name: string; spec: string; cta: string; href: string; featured: boolean }
  > = {
    FREE: {
      name: t.landing.planFree,
      spec: t.landing.freeSpec,
      cta: t.landing.freeCta,
      href: "/signup?plan=free",
      featured: false,
    },
    PRO: {
      name: t.landing.planPro,
      spec: t.landing.proSpec,
      cta: t.landing.proCta,
      href: "/signup?plan=pro",
      featured: true,
    },
    BUSINESS: {
      name: t.landing.planBusiness,
      spec: t.landing.businessSpec,
      cta: t.landing.businessCta,
      href: "mailto:contact@getrida.com",
      featured: false,
    },
  };

  const unlimited = t.usage.unlimited.charAt(0).toUpperCase() + t.usage.unlimited.slice(1);

  function seatsLabel(plan: WorkspacePlan): string {
    const m = PLAN_DEFS[plan].members;
    return Number.isFinite(m) ? `${t.landing.upTo} ${m}` : unlimited;
  }
  function storageLabel(plan: WorkspacePlan): string {
    const d = PLAN_DEFS[plan];
    const base = formatStorageMb(d.storageMb);
    return d.storagePerUser ? `${base} ${t.landing.perUser}` : base;
  }

  return (
    <div>
      {/* Cartes d'offres */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const m = meta[plan];
          const cents = PLAN_DEFS[plan].priceCentsPerUser;
          return (
            <div
              key={plan}
              className={`flex flex-col rounded-2xl border p-6 ${
                m.featured
                  ? "border-indigo-400 bg-white shadow-md ring-1 ring-indigo-200 dark:border-indigo-600 dark:bg-zinc-900 dark:ring-indigo-900"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{m.name}</h3>
                {m.featured && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    ★
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                  {formatPrice(cents)}
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {cents === 0 ? "" : t.landing.perMonth}
                </span>
              </div>

              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex justify-between gap-3">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.landing.rowSeats}</span>
                  <span className="text-right font-medium">{seatsLabel(plan)}</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.landing.rowStorage}</span>
                  <span className="text-right font-medium">{storageLabel(plan)}</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.landing.rowSpecifics}</span>
                  <span className="text-right font-medium">{m.spec}</span>
                </li>
              </ul>

              <Link
                href={m.href}
                className={`mt-6 w-full ${buttonClass(m.featured ? "primary" : "secondary", "md", "justify-center py-2")}`}
              >
                {m.cta}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {t.landing.offersFootnote}
      </p>
    </div>
  );
}
