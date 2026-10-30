"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { inviteMember, type FormState } from "@/lib/actions/workspaces";

export function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(inviteMember, undefined);

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
          Si elle a déjà un compte, elle est ajoutée immédiatement. Sinon, elle
          reçoit un email l&apos;invitant à créer son compte.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="role" className={labelClass}>
          Rôle
        </label>
        <select id="role" name="role" defaultValue="MEMBER" className={inputClass}>
          <option value="MEMBER">Utilisateur</option>
          <option value="ADMIN">Administrateur</option>
        </select>
        <p className="text-xs text-zinc-500">
          Un administrateur peut inviter, désactiver et gérer les rôles des membres.
        </p>
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton>Envoyer l&apos;invitation</SubmitButton>
    </form>
  );
}
