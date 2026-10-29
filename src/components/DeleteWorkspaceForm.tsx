"use client";

import { useActionState, useState } from "react";
import { inputClass, errorClass } from "@/components/ui";
import { deleteWorkspace, type FormState } from "@/lib/actions/workspaces";

export function DeleteWorkspaceForm({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    deleteWorkspace,
    undefined,
  );
  const [value, setValue] = useState("");
  const matches = value.trim() === workspaceName;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="space-y-1">
        <label htmlFor="confirmName" className="text-sm font-medium">
          Pour confirmer, tapez le nom de l&apos;espace :{" "}
          <span className="font-semibold">{workspaceName}</span>
        </label>
        <input
          id="confirmName"
          name="confirmName"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          className={inputClass}
          placeholder={workspaceName}
        />
      </div>

      {state?.error && <p className={errorClass}>{state.error}</p>}

      <button
        type="submit"
        disabled={!matches || pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-950"
      >
        {pending ? "Suppression…" : "Supprimer définitivement cet espace"}
      </button>
    </form>
  );
}
