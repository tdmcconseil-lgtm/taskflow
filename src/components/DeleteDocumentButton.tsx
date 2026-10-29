"use client";

import { deleteDocument } from "@/lib/actions/documents";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  return (
    <form
      action={deleteDocument}
      onSubmit={(e) => {
        if (!confirm("Supprimer ce document ? Il sera retiré de toutes les tâches liées.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="documentId" value={documentId} />
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        Supprimer
      </button>
    </form>
  );
}
