"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { setLocale } from "@/lib/actions/locale";
import { Flag } from "@/components/Flag";

// Sélecteur de langue (FR / EN / ES) : une rangée de drapeaux SVG cliquables
// (les emojis de drapeaux ne s'affichent pas sous Windows). Mémorise le choix
// (cookie) et rafraîchit la page pour l'appliquer partout.
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t.common.language}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700 ${className}`}
    >
      {locales.map((l) => {
        const selected = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => choose(l)}
            disabled={pending}
            aria-pressed={selected}
            title={localeNames[l]}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-60 ${
              selected
                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-700"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Flag locale={l} className="h-3.5 w-5" />
            <span className="uppercase">{l}</span>
          </button>
        );
      })}
    </div>
  );
}
