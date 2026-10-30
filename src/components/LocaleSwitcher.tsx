"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { locales, localeNames, localeFlags, type Locale } from "@/lib/i18n/config";
import { setLocale } from "@/lib/actions/locale";

// Sélecteur de langue (FR / EN / ES). Mémorise le choix (cookie) et rafraîchit
// la page pour l'appliquer partout.
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={t.common.language}
      value={locale}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Locale;
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        });
      }}
      className={`rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 ${className}`}
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeFlags[l]} {localeNames[l]}
        </option>
      ))}
    </select>
  );
}
