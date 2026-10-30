"use client";

import { useActionState } from "react";
import { renameDocument } from "@/lib/actions/documents";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, errorClass } from "@/components/ui";
import { useT } from "@/lib/i18n/context";

export function RenameDocumentForm({
  documentId,
  name,
}: {
  documentId: string;
  name: string;
}) {
  const t = useT();
  const [state, action] = useActionState(renameDocument, undefined);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="documentId" value={documentId} />
      <div className="flex flex-wrap items-center gap-2">
        <input name="name" defaultValue={name} className={`${inputClass} max-w-xs`} />
        <SubmitButton>{t.documentPage.rename}</SubmitButton>
      </div>
      {state?.error && <p className={errorClass}>{state.error}</p>}
    </form>
  );
}
