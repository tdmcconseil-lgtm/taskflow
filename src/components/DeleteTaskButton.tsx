"use client";

import { useActionState, useState } from "react";
import { deleteTask } from "@/lib/actions/tasks";
import { useT } from "@/lib/i18n/context";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(deleteTask, undefined);
  const [confirming, setConfirming] = useState(false);
  const t = useT();

  return (
    <form action={action} className="relative">
      <input type="hidden" name="taskId" value={taskId} />
      {confirming ? (
        <span className="inline-flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-300">{t.task.confirmDelete}</span>
          <button
            type="submit"
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            {t.common.yes}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t.common.no}
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
        >
          {t.task.delete}
        </button>
      )}
      {state?.error && (
        <p className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}
