"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { createWorkspace, type FormState } from "@/lib/actions/workspaces";
import { PLANS } from "@/lib/plans";
import { useT } from "@/lib/i18n/context";

export function WorkspaceForm() {
  const t = useT();
  const [state, formAction] = useActionState<FormState, FormData>(createWorkspace, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          {t.newWorkspace.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          className={inputClass}
          placeholder={t.newWorkspace.namePlaceholder}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan" className={labelClass}>
          {t.newWorkspace.planLabel}
        </label>
        <select id="plan" name="plan" defaultValue="FREE" className={inputClass}>
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.newWorkspace.planHint}</p>
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton>{t.newWorkspace.create}</SubmitButton>
    </form>
  );
}
