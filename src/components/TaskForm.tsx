"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import type { FormState } from "@/lib/actions/tasks";
import { useT } from "@/lib/i18n/context";

type Member = { id: string; name: string };

type TaskDefaults = {
  title?: string;
  description?: string;
  assigneeId?: string;
  priority?: string;
  dueDate?: string;
};

export function TaskForm({
  action,
  members,
  hidden = {},
  defaults = {},
  submitLabel,
  cancelHref,
  showAccess = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  members: Member[];
  hidden?: Record<string, string>;
  defaults?: TaskDefaults;
  submitLabel: string;
  cancelHref?: string;
  // Affiche la section « Accès au projet » (uniquement à la création d'un projet).
  showAccess?: boolean;
}) {
  const t = useT();
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="space-y-1">
        <label htmlFor="title" className={labelClass}>
          {t.task.title}
        </label>
        <input
          id="title"
          name="title"
          defaultValue={defaults.title}
          className={inputClass}
          placeholder={t.task.titlePlaceholder}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className={labelClass}>
          {t.task.description} <span className="text-zinc-400 dark:text-zinc-300">{t.task.optional}</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults.description}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="assigneeId" className={labelClass}>
            {t.task.assignee}
          </label>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue={defaults.assigneeId ?? ""}
            className={inputClass}
          >
            <option value="">{t.task.nobody}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="priority" className={labelClass}>
            {t.task.priority}
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={defaults.priority ?? "MEDIUM"}
            className={inputClass}
          >
            <option value="LOW">{t.task.priorityLow}</option>
            <option value="MEDIUM">{t.task.priorityMedium}</option>
            <option value="HIGH">{t.task.priorityHigh}</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="dueDate" className={labelClass}>
            {t.task.dueDate}
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults.dueDate}
            className={inputClass}
          />
        </div>
      </div>

      {showAccess && (
        <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <legend className={`${labelClass} px-1`}>{t.task.access}</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="visibility" value="RESTRICTED" defaultChecked className="mt-0.5" />
            <span>
              <span className="font-medium">{t.task.accessRestricted}</span> —{" "}
              {t.task.accessRestrictedDesc}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="visibility" value="WORKSPACE" className="mt-0.5" />
            <span>
              <span className="font-medium">{t.task.accessWorkspace}</span> —{" "}
              {t.task.accessWorkspaceDesc}
            </span>
          </label>
          {members.length > 0 && (
            <div className="pt-1">
              <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-300">{t.task.allowedMembers}</p>
              <div className="space-y-1">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="members" value={m.id} />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      )}

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <div className="flex items-center gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        {cancelHref && (
          <Link
            href={cancelHref}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t.task.cancel}
          </Link>
        )}
      </div>
    </form>
  );
}
