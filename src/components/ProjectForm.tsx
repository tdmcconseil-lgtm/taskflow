"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { createProject, type FormState } from "@/lib/actions/projects";

export function ProjectForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(createProject, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          Nom du projet
        </label>
        <input id="name" name="name" className={inputClass} placeholder="Ex. Refonte du site" />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className={labelClass}>
          Description <span className="text-zinc-400">(facultatif)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className={inputClass}
          placeholder="À quoi sert ce projet ?"
        />
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton>Créer le projet</SubmitButton>
    </form>
  );
}
