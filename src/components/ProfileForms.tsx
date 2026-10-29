"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import {
  updateProfileName,
  requestEmailChange,
  changePassword,
  type FormState,
} from "@/lib/actions/profile";

export function NameForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileName, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="firstName" className={labelClass}>
            Prénom
          </label>
          <input
            id="firstName"
            name="firstName"
            defaultValue={firstName}
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
            defaultValue={lastName}
            autoComplete="family-name"
            className={inputClass}
          />
        </div>
      </div>
      {state?.error && <p className={errorClass}>{state.error}</p>}
      <SubmitButton>Enregistrer</SubmitButton>
    </form>
  );
}

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action] = useActionState<FormState, FormData>(requestEmailChange, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-zinc-500">
        Adresse actuelle : <span className="font-medium text-zinc-700 dark:text-zinc-300">{currentEmail}</span>
      </p>
      <div className="space-y-1">
        <label htmlFor="newEmail" className={labelClass}>
          Nouvelle adresse email
        </label>
        <input id="newEmail" name="newEmail" type="email" autoComplete="off" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="emailPassword" className={labelClass}>
          Mot de passe actuel
        </label>
        <input
          id="emailPassword"
          name="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <p className="text-xs text-zinc-500">
        Un email de confirmation sera envoyé à la nouvelle adresse ; le changement
        ne prend effet qu&apos;après avoir cliqué sur le lien reçu.
      </p>
      {state?.error && <p className={errorClass}>{state.error}</p>}
      <SubmitButton>Envoyer la confirmation</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="current" className={labelClass}>
          Mot de passe actuel
        </label>
        <input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="newPassword" className={labelClass}>
          Nouveau mot de passe
        </label>
        <input
          id="newPassword"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
        <p className="text-xs text-zinc-500">8 caractères minimum.</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="confirm" className={labelClass}>
          Confirmer le nouveau mot de passe
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
      <SubmitButton>Changer le mot de passe</SubmitButton>
    </form>
  );
}
