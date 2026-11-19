"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import { ToggleSwitch } from "@/components/ToggleSwitch";

// Case « Masquer mes actions » (cochée par défaut). Décocher ajoute ?mine=1
// pour inclure ses propres actions dans le flux. Les autres paramètres d'URL
// (onglet, tri) sont préservés.
export function EventFilter({ hideMine }: { hideMine: boolean }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onToggle(checked: boolean) {
    const sp = new URLSearchParams(searchParams);
    if (checked) sp.delete("mine");
    else sp.set("mine", "1");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <ToggleSwitch checked={hideMine} onChange={(e) => onToggle(e.target.checked)} />
      {t.events.hideMine}
    </label>
  );
}
