"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/context";

export type IdeaSort = "votes" | "recent" | "oldest";
export type IdeaFilter = "all" | "mine" | "others";

// Barre de contrôles de la liste d'idées : un groupe « Trier » (pouces / plus
// récentes / plus anciennes) et un groupe « Afficher » (toutes / mes idées /
// sauf les miennes). L'état vit dans l'URL (?sort=&filter=) ; les valeurs par
// défaut (votes, all) ne sont pas écrites pour garder l'URL propre.
export function IdeaControls({ sort, filter }: { sort: IdeaSort; filter: IdeaFilter }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (key: "sort" | "filter", value: string, isDefault: boolean) => {
    const sp = new URLSearchParams(params.toString());
    if (isDefault) sp.delete(key);
    else sp.set(key, value);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition ${
      active
        ? "bg-indigo-600 text-white"
        : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    }`;

  const sorts: { value: IdeaSort; label: string }[] = [
    { value: "votes", label: t.ideas.sortVotes },
    { value: "recent", label: t.ideas.sortRecent },
    { value: "oldest", label: t.ideas.sortOldest },
  ];
  const filters: { value: IdeaFilter; label: string }[] = [
    { value: "all", label: t.ideas.filterAll },
    { value: "mine", label: t.ideas.filterMine },
    { value: "others", label: t.ideas.filterOthers },
  ];

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {t.ideas.sortLabel}
        </span>
        {sorts.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => go("sort", s.value, s.value === "votes")}
            className={pill(sort === s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {t.ideas.filterLabel}
        </span>
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => go("filter", f.value, f.value === "all")}
            className={pill(filter === f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
