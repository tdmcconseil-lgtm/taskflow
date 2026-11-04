"use client";

import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import { ToggleSwitch } from "@/components/ToggleSwitch";

// Case « Masquer mes actions » (cochée par défaut). Décocher ajoute ?mine=1
// pour inclure ses propres actions dans le flux.
export function EventFilter({ hideMine }: { hideMine: boolean }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <ToggleSwitch
        checked={hideMine}
        onChange={(e) => router.push(e.target.checked ? pathname : `${pathname}?mine=1`)}
      />
      {t.events.hideMine}
    </label>
  );
}
