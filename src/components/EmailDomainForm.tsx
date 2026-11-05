"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { updateAllowedEmailDomains, type AdminFormState } from "@/lib/actions/admin";
import { useT } from "@/lib/i18n/context";

// Volet Identité : restriction d'accès de l'espace par domaine email. Un champ
// libre (domaines séparés par des virgules) ; vide = aucune restriction. Si des
// membres actuels ne respectent pas la règle, ils sont listés à titre indicatif
// (ils ne sont pas retirés : grandfathering).
export function EmailDomainForm({
  workspaceId,
  domains,
  nonCompliant,
}: {
  workspaceId: string;
  domains: string[];
  nonCompliant: { name: string; email: string }[];
}) {
  const t = useT();
  const [state, formAction] = useActionState<AdminFormState, FormData>(
    updateAllowedEmailDomains,
    undefined,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800"
    >
      <div>
        <h3 className="text-base font-semibold">{t.emailDomains.title}</h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.emailDomains.desc}</p>
      </div>
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="space-y-1">
        <label htmlFor="domains" className={labelClass}>
          {t.emailDomains.label}
        </label>
        <input
          id="domains"
          name="domains"
          defaultValue={domains.join(", ")}
          placeholder={t.emailDomains.placeholder}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.emailDomains.hint}</p>
      </div>

      {domains.length > 0 && nonCompliant.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <p className="font-medium">{t.emailDomains.nonCompliantTitle}</p>
          <p className="mt-1">{t.emailDomains.nonCompliantDesc}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {nonCompliant.map((m) => (
              <li key={m.email}>
                {m.name}{" "}
                <span className="text-amber-600 dark:text-amber-400">({m.email})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state?.error && <p className={errorClass}>{state.error}</p>}
      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {t.emailDomains.saved}
        </p>
      )}

      <SubmitButton>{t.emailDomains.save}</SubmitButton>
    </form>
  );
}
