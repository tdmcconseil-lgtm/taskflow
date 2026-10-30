"use client";

import { useActionState, useEffect, useState } from "react";
import { setTaskStatus, type FormState } from "@/lib/actions/tasks";
import { STATUS_ORDER } from "@/lib/labels";
import { useT } from "@/lib/i18n/context";
import type { TaskStatus } from "@/generated/prisma/client";

export function StatusSelect({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const t = useT();
  const [state, formAction] = useActionState<FormState, FormData>(setTaskStatus, undefined);
  const [value, setValue] = useState<TaskStatus>(status);

  // Re-synchronise après un changement réussi (la page est revalidée).
  useEffect(() => {
    setValue(status);
  }, [status]);
  // En cas de refus (sous-tâches non terminées…), on remet le statut réel.
  useEffect(() => {
    if (state?.error) setValue(status);
  }, [state, status]);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="taskId" value={taskId} />
        <select
          name="status"
          value={value}
          onChange={(e) => {
            setValue(e.target.value as TaskStatus);
            e.currentTarget.form?.requestSubmit();
          }}
          aria-label="Changer le statut"
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {t.status[s]}
            </option>
          ))}
        </select>
      </form>
      {state?.error && (
        <p className="max-w-[15rem] text-right text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}
