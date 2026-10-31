"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { acceptInvitation, type FormState } from "@/lib/actions/workspaces";
import { useT } from "@/lib/i18n/context";

export function AcceptInvitationForm({
  token,
  email,
  existingAccount = false,
}: {
  token: string;
  email: string;
  // Un compte existe déjà pour cet email : on ne demande ni nom ni mot de passe,
  // juste une validation pour rejoindre l'espace.
  existingAccount?: boolean;
}) {
  const t = useT();
  const [state, formAction] = useActionState<FormState, FormData>(acceptInvitation, undefined);

  if (existingAccount) {
    return (
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email} />
        {state?.error && <p className={errorClass}>{state.error}</p>}
        <SubmitButton className="w-full">{t.invitePage.join}</SubmitButton>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>
          {t.auth.email}
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
            {t.auth.firstName}
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
            {t.auth.lastName} <span className="text-zinc-400 dark:text-zinc-500">{t.auth.optional}</span>
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
          {t.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.auth.passwordHint}</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm" className={labelClass}>
          {t.profileForms.confirmPassword}
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

      <SubmitButton className="w-full">{t.profileForms.createAndJoin}</SubmitButton>
    </form>
  );
}
