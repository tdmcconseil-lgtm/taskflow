"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SortDir, SortState } from "@/lib/sort";

type Option = { key: string; label: string; defaultDir: SortDir };

// Contrôle de tri réutilisable (un menu « Trier par » + un sens croissant /
// décroissant), posé en tête d'une vue en liste. Entièrement piloté par l'URL :
// le choix est donc mémorisé par vue et partagé entre la page globale et l'onglet
// d'espace d'un même type de contenu. Les autres paramètres (onglet, filtre, tri
// des autres types) sont préservés.
export function SortControl({
  param,
  dirParam,
  byLabel,
  ascLabel,
  descLabel,
  options,
  current,
}: {
  param: string;
  dirParam: string;
  byLabel: string;
  ascLabel: string;
  descLabel: string;
  options: Option[];
  current: SortState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(next: SortState) {
    const sp = new URLSearchParams(searchParams);
    sp.set(param, next.key);
    sp.set(dirParam, next.dir);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onKeyChange(key: string) {
    const opt = options.find((o) => o.key === key) ?? options[0];
    // Changer de critère réapplique le sens naturel de ce critère.
    push({ key, dir: opt.defaultDir });
  }

  function toggleDir() {
    push({ key: current.key, dir: current.dir === "asc" ? "desc" : "asc" });
  }

  const dirLabel = current.dir === "asc" ? ascLabel : descLabel;

  return (
    <div className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
      <label className="inline-flex items-center gap-1.5">
        <span className="whitespace-nowrap text-zinc-500 dark:text-zinc-400">{byLabel}</span>
        <select
          value={current.key}
          onChange={(e) => onKeyChange(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-300 bg-white py-1 pl-2 pr-7 text-sm text-zinc-800 transition hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
        >
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={toggleDir}
        aria-label={dirLabel}
        title={dirLabel}
        aria-pressed={current.dir === "desc"}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4"
        >
          {current.dir === "asc" ? (
            // Flèche vers le haut : ordre croissant.
            <>
              <path d="M12 19V5" />
              <path d="m6 11 6-6 6 6" />
            </>
          ) : (
            // Flèche vers le bas : ordre décroissant.
            <>
              <path d="M12 5v14" />
              <path d="m6 13 6 6 6-6" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
