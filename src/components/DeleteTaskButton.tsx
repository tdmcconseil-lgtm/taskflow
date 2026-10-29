"use client";

import { useActionState } from "react";
import { deleteTask } from "@/lib/actions/tasks";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(deleteTask, undefined);

  return (
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
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        Supprimer
      </button>
      {state?.error && (
        <p className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}
