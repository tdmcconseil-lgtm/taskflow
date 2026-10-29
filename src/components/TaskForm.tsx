"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import type { FormState } from "@/lib/actions/tasks";

type Member = { id: string; name: string };

type TaskDefaults = {
  title?: string;
  description?: string;
  assigneeId?: string;
  priority?: string;
  dueDate?: string;
};

export function TaskForm({
  action,
  members,
  hidden = {},
  defaults = {},
  submitLabel,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  members: Member[];
  hidden?: Record<string, string>;
  defaults?: TaskDefaults;
  submitLabel: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="space-y-1">
        <label htmlFor="title" className={labelClass}>
          Titre
        </label>
        <input
          id="title"
          name="title"
          defaultValue={defaults.title}
          className={inputClass}
          placeholder="Ex. Rédiger la page d'accueil"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className={labelClass}>
          Description <span className="text-zinc-400">(facultatif)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults.description}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="assigneeId" className={labelClass}>
            Assigné à
          </label>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue={defaults.assigneeId ?? ""}
            className={inputClass}
          >
            <option value="">Personne</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="priority" className={labelClass}>
            Priorité
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={defaults.priority ?? "MEDIUM"}
            className={inputClass}
          >
            <option value="LOW">Basse</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="HIGH">Haute</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="dueDate" className={labelClass}>
            Échéance
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults.dueDate}
            className={inputClass}
          />
        </div>
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <div className="flex items-center gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        {cancelHref && (
          <Link
            href={cancelHref}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Annuler
          </Link>
        )}
      </div>
    </form>
  );
}
