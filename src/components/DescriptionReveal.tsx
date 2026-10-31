"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/context";

// Bandeau de données (assigné / échéance / priorité) avec une flèche à droite
// qui révèle la description en dessous. Aucun intitulé « Description ».
export function DescriptionReveal({
  banner,
  description,
}: {
  banner: ReactNode;
  description: ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="min-w-0 flex-1">{banner}</div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title={open ? t.descriptionReveal.hide : t.descriptionReveal.show}
          aria-label={open ? t.descriptionReveal.hide : t.descriptionReveal.show}
          className="shrink-0 rounded-md p-1 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <span className={`inline-block text-sm transition ${open ? "rotate-90" : ""}`}>▸</span>
        </button>
      </div>
      {open && <div>{description}</div>}
    </div>
  );
}
