"use client";

import { deleteTask } from "@/lib/actions/tasks";
import { StatusSelect } from "@/components/StatusSelect";
import type { TaskStatus } from "@/generated/prisma/client";

export function TaskControls({ taskId, status }: { taskId: string; status: TaskStatus }) {
  return (
    <div className="flex items-center gap-1">
      <StatusSelect taskId={taskId} status={status} />

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
