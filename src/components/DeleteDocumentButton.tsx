"use client";

import { deleteDocument } from "@/lib/actions/documents";
import { useT } from "@/lib/i18n/context";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const t = useT();
  return (
    <form
      action={deleteDocument}
      onSubmit={(e) => {
        if (!confirm(t.documentPage.deleteConfirm)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="documentId" value={documentId} />
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        {t.documentPage.delete}
      </button>
    </form>
  );
}
