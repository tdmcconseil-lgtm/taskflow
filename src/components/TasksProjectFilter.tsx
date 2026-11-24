"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import { ToggleSwitch } from "@/components/ToggleSwitch";

// Interrupteur « Afficher mes projets » (activé par défaut) sur la page « Mes
// tâches à faire ». Décocher ajoute ?projects=0 pour exclure les projets (tâches
// racines) de la liste. Les autres paramètres d'URL (tri) sont préservés.
export function TasksProjectFilter({ showProjects }: { showProjects: boolean }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onToggle(checked: boolean) {
    const sp = new URLSearchParams(searchParams);
    if (checked) sp.delete("projects");
    else sp.set("projects", "0");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <ToggleSwitch checked={showProjects} onChange={(e) => onToggle(e.target.checked)} />
      {t.dashboard.showProjects}
    </label>
  );
}
