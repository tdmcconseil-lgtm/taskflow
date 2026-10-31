"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { requestPasswordReset, type FormState } from "@/lib/actions/password-reset";
import { useT } from "@/lib/i18n/context";

export function ForgotPasswordForm() {
  const t = useT();
  const [state, formAction] = useActionState<FormState, FormData>(requestPasswordReset, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>
          {t.forgotPassword.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          className={inputClass}
        />
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton className="w-full">{t.forgotPassword.submit}</SubmitButton>
    </form>
  );
}
