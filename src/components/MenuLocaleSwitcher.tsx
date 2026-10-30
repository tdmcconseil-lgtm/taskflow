"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { setLocale } from "@/lib/actions/locale";
import { Flag } from "@/components/Flag";

// Sélecteur de langue du menu latéral : un bouton (drapeau + langue courante) qui
// ouvre, vers le HAUT, la liste des langues (il est tout en bas du menu). On
// choisit la langue directement là, sans passer par la page profil.
export function MenuLocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
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
    setLocale(next).then(() => router.refresh());
  }

  return (
    <div ref={ref} className="relative mt-4">
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => choose(l)}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm transition ${
                  l === locale
                    ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <Flag locale={l} className="h-3.5 w-5" />
                <span>{localeNames[l]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <Flag locale={locale} className="h-3.5 w-5" />
        <span className="flex-1 text-left">{localeNames[locale]}</span>
        <span aria-hidden className="text-xs text-zinc-400">
          {open ? "▴" : "▾"}
        </span>
      </button>
    </div>
  );
}
