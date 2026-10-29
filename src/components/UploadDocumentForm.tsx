"use client";

import { useActionState } from "react";
import { uploadDocument } from "@/lib/actions/documents";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";

const fileInputClass =
  "block w-full text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500 dark:text-zinc-400";

export function UploadDocumentForm({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(uploadDocument, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      {state?.error && <p className={errorClass}>{state.error}</p>}

      <div className="space-y-1">
        <label className={labelClass} htmlFor="file">
          Fichier
        </label>
        <input id="file" name="file" type="file" required className={fileInputClass} />
        <p className="text-xs text-zinc-400">10 Mo maximum.</p>
      </div>

      <div className="space-y-1">
        <label className={labelClass} htmlFor="name">
          Nom simplifié <span className="font-normal text-zinc-400">(facultatif)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Par défaut : le nom du fichier"
          className={inputClass}
        />
      </div>

      <SubmitButton>Téléverser</SubmitButton>
    </form>
  );
}
