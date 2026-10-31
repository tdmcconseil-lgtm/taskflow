"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { resetPassword, type FormState } from "@/lib/actions/password-reset";
import { usePasswordConfirmMirror } from "@/components/usePasswordConfirmMirror";
import { useT } from "@/lib/i18n/context";

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const t = useT();
  const [state, formAction] = useActionState<FormState, FormData>(resetPassword, undefined);
  const { confirmRef, onPasswordInput } = usePasswordConfirmMirror();

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {/* Email en lecture seule + autocomplete=username : le gestionnaire de mots
          de passe de Chrome associe le nouveau mot de passe à cette adresse et
          propose de l'enregistrer. */}
      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>
          {t.auth.email}
        </label>
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

      <div className="space-y-1">
        <label htmlFor="password" className={labelClass}>
          {t.forgotPassword.newPassword}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          onInput={onPasswordInput}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.auth.passwordHint}</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm" className={labelClass}>
          {t.forgotPassword.confirmPassword}
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          ref={confirmRef}
          className={inputClass}
        />
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton className="w-full">{t.forgotPassword.resetSubmit}</SubmitButton>
    </form>
  );
}
