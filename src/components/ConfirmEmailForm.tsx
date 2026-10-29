"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { errorClass } from "@/components/ui";
import { confirmEmailChange, type FormState } from "@/lib/actions/profile";

export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(confirmEmailChange, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state?.error && <p className={errorClass}>{state.error}</p>}
      <SubmitButton className="w-full">Confirmer mon nouvel email</SubmitButton>
    </form>
  );
}
