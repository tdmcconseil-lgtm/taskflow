"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { createIdea, type FormState } from "@/lib/actions/ideas";
import { useT } from "@/lib/i18n/context";

// Formulaire de création d'une idée. Le champ pseudo n'apparaît que si
// l'utilisateur n'en a pas encore (il devient alors son pseudo persistant).
export function IdeaForm({ hasPseudo }: { hasPseudo: boolean }) {
  const t = useT();
  const [state, formAction] = useActionState<FormState, FormData>(createIdea, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="title" className={labelClass}>
          {t.ideas.titleField}
        </label>
        <input
          id="title"
          name="title"
          className={inputClass}
          placeholder={t.ideas.titlePlaceholder}
          autoFocus
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="body" className={labelClass}>
          {t.ideas.bodyField}{" "}
          <span className="text-zinc-400 dark:text-zinc-500">{t.ideas.optional}</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={4}
          className={inputClass}
          placeholder={t.ideas.bodyPlaceholder}
        />
      </div>

      {!hasPseudo && (
        <div className="space-y-1">
          <label htmlFor="pseudo" className={labelClass}>
            {t.ideas.pseudoField}
          </label>
          <input
            id="pseudo"
            name="pseudo"
            className={inputClass}
            placeholder={t.ideas.pseudoPlaceholder}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.ideas.pseudoPrompt}</p>
        </div>
      )}

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <div className="flex items-center gap-2">
        <SubmitButton>{t.ideas.create}</SubmitButton>
        <Link
          href="/app/idees"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {t.ideas.cancel}
        </Link>
      </div>
    </form>
  );
}
