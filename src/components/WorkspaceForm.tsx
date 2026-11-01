"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { createWorkspace, type FormState } from "@/lib/actions/workspaces";
import { PLANS, PLAN_LIMITS, formatStorageMb } from "@/lib/plans";
import { useT } from "@/lib/i18n/context";

export function WorkspaceForm() {
  const t = useT();
  const [state, formAction] = useActionState<FormState, FormData>(createWorkspace, undefined);
  const fmt = (n: number) => (Number.isFinite(n) ? String(n) : t.usage.unlimited);

  return (
    <form action={formAction} className="space-y-6">
      {/* 1. Choix de la formule — première étape de la création. */}
      <fieldset className="space-y-3">
        <legend className={labelClass}>{t.newWorkspace.planStep}</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PLANS.map((p) => {
            const limits = PLAN_LIMITS[p];
            return (
              <label
                key={p}
                className="flex cursor-pointer flex-col gap-2 rounded-xl border border-zinc-200 p-4 transition hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:ring-1 has-[:checked]:ring-indigo-500 dark:border-zinc-800 dark:hover:border-indigo-700 dark:has-[:checked]:bg-indigo-950/30"
              >
                <input
                  type="radio"
                  name="plan"
                  value={p}
                  defaultChecked={p === "FREE"}
                  className="sr-only"
                />
                <span className="font-semibold">{p}</span>
                <ul className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <li>
                    {fmt(limits.members)} {t.usage.members.toLowerCase()}
                  </li>
                  <li>
                    {fmt(limits.projects)} {t.usage.projects.toLowerCase()}
                  </li>
                  <li>{formatStorageMb(limits.storageMb)}</li>
                </ul>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.newWorkspace.planHint}</p>
      </fieldset>

      {/* 2. Nom de l'espace. */}
      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          {t.newWorkspace.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          className={inputClass}
          placeholder={t.newWorkspace.namePlaceholder}
        />
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <SubmitButton>{t.newWorkspace.create}</SubmitButton>
    </form>
  );
}
