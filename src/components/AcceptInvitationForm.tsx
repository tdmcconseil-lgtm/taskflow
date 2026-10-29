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
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        {/* readOnly (et non disabled) + autocomplete=username : Chrome enregistre
            le mot de passe avec l'email comme identifiant, pas avec le nom. */}
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          readOnly
          autoComplete="username"
          className={`${inputClass} cursor-not-allowed opacity-70`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="firstName" className={labelClass}>
            Prénom
          </label>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="lastName" className={labelClass}>
            Nom <span className="text-zinc-400">(facultatif)</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            className={inputClass}
          />
        </div>
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
