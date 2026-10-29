"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PriorityBadge } from "@/components/badges";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels";
import { setTaskStatus } from "@/lib/actions/tasks";
import type { TaskStatus, TaskPriority } from "@/generated/prisma/client";

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeName: string | null;
  due: string | null;
  overdue: boolean;
};

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  TODO: "border-t-zinc-300 dark:border-t-zinc-600",
  IN_PROGRESS: "border-t-blue-400",
  DONE: "border-t-green-400",
};

export function KanbanBoard({
  tasks: initial,
  projectId,
}: {
  tasks: BoardTask[];
  projectId: string;
}) {
  const [tasks, setTasks] = useState<BoardTask[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [, startTransition] = useTransition();

  function moveTask(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    const previousStatus = task.status;
    // Mise à jour optimiste : la carte bouge immédiatement.
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("taskId", taskId);
        fd.set("status", status);
        await setTaskStatus(fd);
      } catch {
        // Échec : on remet la carte dans sa colonne d'origine.
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t)),
        );
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(status);
            }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setOverCol(null);
              setDragId(null);
              if (id) moveTask(id, status);
            }}
            className={`flex flex-col rounded-xl border border-t-4 border-zinc-200 bg-zinc-100/60 p-3 transition dark:border-zinc-800 dark:bg-zinc-900/40 ${
              COLUMN_ACCENT[status]
            } ${overCol === status ? "ring-2 ring-indigo-400" : ""}`}
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {STATUS_LABELS[status]}
              </h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                {columnTasks.length}
              </span>
            </div>

            <div className="flex min-h-24 flex-1 flex-col gap-2">
              {columnTasks.map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", task.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(task.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-800 ${
                    dragId === task.id ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${
                        status === "DONE" ? "text-zinc-400 line-through" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <Link
                      href={`/app/projects/${projectId}/tasks/${task.id}/edit`}
                      title="Modifier la tâche"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 rounded px-1 text-xs text-zinc-400 hover:text-indigo-600"
                    >
                      ✎
                    </Link>
                  </div>
                  {task.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                      {task.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <PriorityBadge priority={task.priority} />
                    {task.assigneeName && <span>👤 {task.assigneeName}</span>}
                    {task.due && (
                      <span
                        className={
                          task.overdue && status !== "DONE"
                            ? "font-medium text-red-600 dark:text-red-400"
                            : ""
                        }
                      >
                        📅 {task.due}
                      </span>
                    )}
                  </div>
                </article>
              ))}

              {columnTasks.length === 0 && (
                <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs italic text-zinc-400 dark:border-zinc-700">
                  Déposez une tâche ici
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
