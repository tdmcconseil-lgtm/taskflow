"use client";

import { useActionState, useState } from "react";
import { deleteTask } from "@/lib/actions/tasks";
import { StatusSelect } from "@/components/StatusSelect";
import { useT } from "@/lib/i18n/context";
import type { TaskStatus } from "@/generated/prisma/client";

export function TaskControls({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [state, action] = useActionState(deleteTask, undefined);
  const [confirming, setConfirming] = useState(false);
  const t = useT();

  return (
    <div className="flex items-center gap-1">
      <StatusSelect taskId={taskId} status={status} />

      <form action={action} className="relative flex items-center">
        <input type="hidden" name="taskId" value={taskId} />
        {confirming ? (
          <span className="inline-flex items-center gap-1 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">{t.task.confirmDelete}</span>
            <button
              type="submit"
              className="rounded-md border border-red-300 px-2 py-1 font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              {t.common.yes}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t.common.no}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title={t.task.deleteTaskTitle}
            className="rounded-md px-2 py-1 text-sm text-zinc-400 dark:text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
          >
            ✕
          </button>
        )}
        {state?.error && (
          <p className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
