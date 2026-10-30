"use client";

import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";

// Case « Masquer mes actions » (cochée par défaut). Décocher ajoute ?mine=1
// pour inclure ses propres actions dans le flux.
export function EventFilter({ hideMine }: { hideMine: boolean }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <input
        type="checkbox"
        checked={hideMine}
        onChange={(e) => router.push(e.target.checked ? pathname : `${pathname}?mine=1`)}
        className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-indigo-600 dark:border-zinc-600"
      />
      {t.events.hideMine}
    </label>
  );
}
