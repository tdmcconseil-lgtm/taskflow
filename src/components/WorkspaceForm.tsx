"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { createWorkspace, type FormState } from "@/lib/actions/workspaces";

export function WorkspaceForm() {
  const [state, formAction] = useActionState<FormState, FormData>(createWorkspace, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          Nom de l&apos;espace
        </label>
        <input id="name" name="name" className={inputClass} placeholder="Ex. Équipe Marketing" />
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton>Créer l&apos;espace</SubmitButton>
    </form>
  );
}
