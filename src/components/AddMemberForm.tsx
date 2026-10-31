"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { inviteMember, type FormState } from "@/lib/actions/workspaces";
import { useT } from "@/lib/i18n/context";

export function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const t = useT();
  const [state, formAction] = useActionState<FormState, FormData>(inviteMember, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>
          {t.members.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={inputClass}
          placeholder={t.members.emailPlaceholder}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.members.emailHint}</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="role" className={labelClass}>
          {t.members.roleLabel}
        </label>
        <select id="role" name="role" defaultValue="MEMBER" className={inputClass}>
          <option value="MEMBER">{t.members.roleUser}</option>
          <option value="ADMIN">{t.members.roleAdmin}</option>
        </select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.members.roleHint}</p>
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton>{t.members.sendInvitation}</SubmitButton>
    </form>
  );
}
