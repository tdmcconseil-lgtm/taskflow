"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { login, signup, type FormState } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/context";
import { inputClass } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useT();
  const action = mode === "login" ? login : signup;
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="firstName" className="text-sm font-medium">
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
            <label htmlFor="lastName" className="text-sm font-medium">
              {t.auth.lastName} <span className="text-zinc-400 dark:text-zinc-300">{t.auth.optional}</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          {t.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          {t.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={inputClass}
        />
        {mode === "signup" && <p className="text-xs text-zinc-500 dark:text-zinc-300">{t.auth.passwordHint}</p>}
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton className="w-full">
        {mode === "login" ? t.auth.signIn : t.auth.createAccount}
      </SubmitButton>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-300">
        {mode === "login" ? (
          <>
            {t.auth.noAccount}{" "}
            <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
              {t.auth.signUp}
            </Link>
          </>
        ) : (
          <>
            {t.auth.haveAccount}{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:underline">
              {t.auth.signIn}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
