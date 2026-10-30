"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { errorClass } from "@/components/ui";
import { confirmEmailChange, type FormState } from "@/lib/actions/profile";
import { useT } from "@/lib/i18n/context";

export function ConfirmEmailForm({ token }: { token: string }) {
  const t = useT();
  const [state, action] = useActionState<FormState, FormData>(confirmEmailChange, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state?.error && <p className={errorClass}>{state.error}</p>}
      <SubmitButton className="w-full">{t.confirmEmail.confirmButton}</SubmitButton>
    </form>
  );
}
