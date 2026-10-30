"use client";

import type { TaskStatus, TaskPriority } from "@/generated/prisma/client";
import { STATUS_STYLES, PRIORITY_STYLES } from "@/lib/labels";
import { useT } from "@/lib/i18n/context";

const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

export function StatusBadge({ status }: { status: TaskStatus }) {
  const t = useT();
  return <span className={`${base} ${STATUS_STYLES[status]}`}>{t.status[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const t = useT();
  return <span className={`${base} ${PRIORITY_STYLES[priority]}`}>{t.priority[priority]}</span>;
}
