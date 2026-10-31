"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { setLocale } from "@/lib/actions/locale";
import { Flag } from "@/components/Flag";

// Sélecteur de langue (FR / EN / ES) sur les pages publiques et le profil, sur
// le même principe que le menu connecté (MenuLocaleSwitcher) : un bouton
// (drapeau + langue courante) qui déploie la liste VERS LE BAS ; on clique une
// langue, le choix est mémorisé (cookie) et la page rafraîchie.
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur et à la touche Échap.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    setPending(true);
    // router.refresh() ne remonte pas ce composant client : on réarme le bouton
    // nous-mêmes, sinon il reste désactivé jusqu'au rechargement complet.
    setLocale(next)
      .then(() => router.refresh())
      .finally(() => setPending(false));
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.common.language}
        className="flex items-center gap-2 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Flag locale={locale} className="h-3.5 w-5" />
        <span>{localeNames[locale]}</span>
        <span aria-hidden className="text-xs text-zinc-400 dark:text-zinc-300">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t.common.language}
          className="absolute right-0 top-full z-10 mt-1 min-w-full overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => choose(l)}
                className={`flex w-full items-center gap-2 whitespace-nowrap px-3 py-1.5 text-sm transition ${
                  l === locale
                    ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Flag locale={l} className="h-3.5 w-5" />
                <span>{localeNames[l]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
