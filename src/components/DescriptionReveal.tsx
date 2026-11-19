"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/context";
import { HintBubble } from "@/components/HintBubble";

// Au-delà de cette longueur, la 1ʳᵉ ligne sera tronquée visuellement : on propose
// alors « afficher plus » même en l'absence de retour à la ligne.
const TRUNCATE_THRESHOLD = 80;

// Bandeau de données (assigné / échéance / priorité) suivi d'une ligne
// « Description » : intitulé + 1ʳᵉ ligne tronquée (hauteur constante) et, s'il y a
// davantage de texte, un libellé « afficher plus / moins » qui déroule le tout
// sur place.
export function DescriptionReveal({
  banner,
  description,
  rendered,
}: {
  banner: ReactNode;
  description: string | null;
  rendered: ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const text = description?.trim() ?? "";
  const hasDescription = text.length > 0;
  const firstLine = text.split("\n")[0] ?? "";
  const hasMore = hasDescription && (text.includes("\n") || firstLine.length > TRUNCATE_THRESHOLD);

  return (
    <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      {banner}
      <dl>
        <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {t.task.description}
          <HintBubble anchor="description" className="ml-1.5" />
        </dt>
        <dd className="mt-1">
          {!hasDescription ? (
            <p className="text-sm italic text-zinc-400 dark:text-zinc-500">{t.task.noDescription}</p>
          ) : open ? (
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{rendered}</p>
          ) : (
            <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">{firstLine}</p>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="mt-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {open ? t.descriptionReveal.less : t.descriptionReveal.more}
            </button>
          )}
        </dd>
      </dl>
    </div>
  );
}
