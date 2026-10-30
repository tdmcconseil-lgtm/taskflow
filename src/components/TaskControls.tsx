"use client";

import { useActionState } from "react";
import { deleteTask } from "@/lib/actions/tasks";
import { StatusSelect } from "@/components/StatusSelect";
import type { TaskStatus } from "@/generated/prisma/client";

export function TaskControls({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [state, action] = useActionState(deleteTask, undefined);

  return (
    <div className="flex items-center gap-1">
      <StatusSelect taskId={taskId} status={status} />

      <form
        action={action}
        className="relative"
        onSubmit={(e) => {
          if (!confirm("Supprimer cette tâche ?")) e.preventDefault();
        }}
      >
        <input type="hidden" name="taskId" value={taskId} />
        <button
          type="submit"
          title="Supprimer la tâche"
          className="rounded-md px-2 py-1 text-sm text-zinc-400 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
        >
          ✕
        </button>
        {state?.error && (
          <p className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
