"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { createWorkspace, type FormState } from "@/lib/actions/workspaces";
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

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton>{t.newWorkspace.create}</SubmitButton>
    </form>
  );
}
