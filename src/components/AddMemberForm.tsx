"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { addMember, type FormState } from "@/lib/actions/workspaces";

export function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(addMember, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>
          Email de la personne
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={inputClass}
          placeholder="personne@exemple.fr"
        />
        <p className="text-xs text-zinc-500">
          La personne doit déjà avoir un compte Taskflow.
        </p>
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton>Ajouter au workspace</SubmitButton>
    </form>
  );
}
