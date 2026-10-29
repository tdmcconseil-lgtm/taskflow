"use client";

import { deleteTask } from "@/lib/actions/tasks";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  return (
    <form
      action={deleteTask}
      onSubmit={(e) => {
        if (
          !confirm(
            "Supprimer cette tâche ? Ses sous-tâches éventuelles seront aussi supprimées.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        Supprimer
      </button>
    </form>
  );
}
