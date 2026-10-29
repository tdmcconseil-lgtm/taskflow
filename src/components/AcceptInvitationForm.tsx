"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { acceptInvitation, type FormState } from "@/lib/actions/workspaces";

export function AcceptInvitationForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(acceptInvitation, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1">
        <label className={labelClass}>Email</label>
        <input
          value={email}
          disabled
          className={`${inputClass} cursor-not-allowed opacity-70`}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          Nom
        </label>
        <input id="name" name="name" autoComplete="name" className={inputClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className={labelClass}>
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
        <p className="text-xs text-zinc-500">8 caractères minimum.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm" className={labelClass}>
          Confirmer le mot de passe
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton className="w-full">Créer mon compte et rejoindre</SubmitButton>
    </form>
  );
}
