"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PriorityBadge } from "@/components/badges";
import { UserAvatar } from "@/components/UserAvatar";
import { TaskControls } from "@/components/TaskControls";
import { reorderTasks } from "@/lib/actions/tasks";
import type { AssigneeInfo } from "@/lib/task-tree";
import type { TaskStatus, TaskPriority } from "@/generated/prisma/client";

export type SubtaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: AssigneeInfo | null;
  due: string | null;
  overdue: boolean;
  childCount: number;
  attachmentCount: number;
};

export function ReorderableSubtasks({
  parentId,
  items,
}: {
  parentId: string;
  items: SubtaskItem[];
}) {
  const [order, setOrder] = useState<SubtaskItem[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const orderRef = useRef<string[]>(items.map((i) => i.id));

  // Resynchronise si la composition de la liste change (ajout / suppression).
  const membership = items.map((i) => i.id).slice().sort().join(",");
  useEffect(() => {
    setOrder(items);
    orderRef.current = items.map((i) => i.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership]);

  useEffect(() => {
    orderRef.current = order.map((i) => i.id);
  }, [order]);

  function onEnter(overId: string) {
    if (!dragId || dragId === overId) return;
    setOrder((prev) => {
      const from = prev.findIndex((x) => x.id === dragId);
      const to = prev.findIndex((x) => x.id === overId);
      if (from < 0 || to < 0) return prev;
      const copy = prev.slice();
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  function onDrop() {
    if (dragId) reorderTasks(parentId, orderRef.current);
    setDragId(null);
  }

  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {order.map((t) => {
        const done = t.status === "DONE";
        return (
          <li
            key={t.id}
            onDragEnter={() => onEnter(t.id)}
            onDragOver={(e) => e.preventDefault()}
            className={`flex items-center gap-2 p-3 ${
              done ? "bg-zinc-50 dark:bg-zinc-800/40" : "bg-white dark:bg-zinc-900"
            } ${dragId === t.id ? "opacity-40" : ""}`}
          >
            <span
              draggable
              onDragStart={() => setDragId(t.id)}
              onDragEnd={onDrop}
              title="Glisser pour réordonner"
              className="shrink-0 cursor-grab select-none px-1 text-zinc-300 active:cursor-grabbing dark:text-zinc-600"
            >
              ⠿
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-medium">
                <Link
                  href={`/app/tasks/${t.id}`}
                  draggable={false}
                  className={`hover:underline ${done ? "text-zinc-400 dark:text-zinc-500" : ""}`}
                >
                  {t.title}
                </Link>
              </p>
              {t.description && (
                <p
                  className={`mt-0.5 line-clamp-1 text-sm ${
                    done ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-500"
                  }`}
                >
                  {t.description}
                </p>
              )}
              <div
                className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${
                  done ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-500"
                }`}
              >
                {t.assignee ? (
                  <span className="inline-flex items-center gap-1">
                    <UserAvatar user={t.assignee} className="h-4 w-4" />
                    {t.assignee.name}
                  </span>
                ) : (
                  <span>Non assignée</span>
                )}
                {t.due && (
                  <span className={t.overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
                    📅 {t.due}
                  </span>
                )}
                {t.attachmentCount > 0 && (
                  <span title="Pièces jointes">📎 {t.attachmentCount}</span>
                )}
                {t.childCount > 0 && (
                  <span>
                    {t.childCount} sous-tâche{t.childCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <PriorityBadge priority={t.priority} />
              <Link
                href={`/app/tasks/new?parent=${t.id}`}
                draggable={false}
                title="Ajouter une sous-tâche"
                className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800"
              >
                +
              </Link>
              <TaskControls taskId={t.id} status={t.status} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
