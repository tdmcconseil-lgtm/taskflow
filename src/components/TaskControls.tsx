"use client";

import { setTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels";
import type { TaskStatus } from "@/generated/prisma/client";

export function TaskControls({ taskId, status }: { taskId: string; status: TaskStatus }) {
  return (
    <div className="flex items-center gap-1">
      <form action={setTaskStatus}>
        <input type="hidden" name="taskId" value={taskId} />
        <select
          name="status"
          defaultValue={status}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          aria-label="Changer le statut"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </form>

      <form
        action={deleteTask}
        onSubmit={(e) => {
          if (!confirm("Supprimer cette tâche ?")) e.preventDefault();
        }}
      >
        <input type="hidden" name="taskId" value={taskId} />
        <button
          type="submit"
          title="Supprimer la tâche"
          className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
        >
          ✕
        </button>
      </form>
    </div>
  );
}
