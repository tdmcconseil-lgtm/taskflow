"use client";

import type { TaskStatus, TaskPriority } from "@/generated/prisma/client";
import { STATUS_STYLES, PRIORITY_DOT, PRIORITY_TEXT } from "@/lib/labels";
import { useT } from "@/lib/i18n/context";

// Statut : pastille pleine, coin arrondi complet.
export function StatusBadge({ status }: { status: TaskStatus }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {t.status[status]}
    </span>
  );
}

// Priorité : chip bordé (coin moins arrondi) avec une puce colorée en tête, pour
// la distinguer d'un coup d'œil de la pastille de statut.
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-0.5 text-xs font-medium dark:border-zinc-700">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[priority]}`} aria-hidden />
      <span className={PRIORITY_TEXT[priority]}>{t.priority[priority]}</span>
    </span>
  );
}
