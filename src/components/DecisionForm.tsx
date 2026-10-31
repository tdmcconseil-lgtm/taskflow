"use client";

import { useActionState } from "react";
import { createDecision } from "@/lib/actions/decisions";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";

type DocOption = { id: string; name: string };

export function DecisionForm({
  taskId,
  taskDocuments,
  projectDocuments,
}: {
  taskId: string;
  taskDocuments: DocOption[];
  projectDocuments: DocOption[];
}) {
  const [state, action] = useActionState(createDecision, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      {state?.error && <p className={errorClass}>{state.error}</p>}

      <div className="space-y-1">
        <label className={labelClass} htmlFor="content">
          Décision
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={4}
          placeholder="Décrivez la décision prise…"
          className={inputClass}
        />
      </div>

      {(taskDocuments.length > 0 || projectDocuments.length > 0) && (
        <div className="space-y-1">
          <label className={labelClass} htmlFor="documentId">
            Document associé <span className="font-normal text-zinc-400 dark:text-zinc-500">(facultatif)</span>
          </label>
          <select id="documentId" name="documentId" defaultValue="" className={inputClass}>
            <option value="">Aucun</option>
            {taskDocuments.length > 0 && (
              <optgroup label="Documents de la tâche">
                {taskDocuments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            )}
            {projectDocuments.length > 0 && (
              <optgroup label="Documents du projet">
                {projectDocuments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="isProjectDecision"
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700"
        />
        <span>
          Décision projet
          <span className="block text-xs text-zinc-400 dark:text-zinc-500">
            La décision remonte dans l’onglet Décisions du projet.
          </span>
        </span>
      </label>

      <SubmitButton>Ajouter</SubmitButton>
    </form>
  );
}
