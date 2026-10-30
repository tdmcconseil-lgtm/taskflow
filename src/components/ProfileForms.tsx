"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { useT } from "@/lib/i18n/context";
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
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(updateProfileName, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="firstName" className={labelClass}>
            {t.auth.firstName}
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
            {t.auth.lastName} <span className="text-zinc-400 dark:text-zinc-300">{t.auth.optional}</span>
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
      <SubmitButton>{t.profileForms.save}</SubmitButton>
    </form>
  );
}

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(requestEmailChange, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-300">
        {t.profileForms.currentEmail}{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{currentEmail}</span>
      </p>
      <div className="space-y-1">
        <label htmlFor="newEmail" className={labelClass}>
          {t.profileForms.newEmail}
        </label>
        <input id="newEmail" name="newEmail" type="email" autoComplete="off" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="emailPassword" className={labelClass}>
          {t.profileForms.currentPassword}
        </label>
        <input
          id="emailPassword"
          name="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-300">{t.profileForms.emailChangeHint}</p>
      {state?.error && <p className={errorClass}>{state.error}</p>}
      <SubmitButton>{t.profileForms.sendConfirmation}</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(changePassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="current" className={labelClass}>
          {t.profileForms.currentPassword}
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
          {t.profileForms.newPassword}
        </label>
        <input
          id="newPassword"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-300">{t.auth.passwordHint}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="confirm" className={labelClass}>
          {t.profileForms.confirmNewPassword}
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
      <SubmitButton>{t.profileForms.changePassword}</SubmitButton>
    </form>
  );
}
