"use client";

import { useActionState } from "react";
import { uploadDocument } from "@/lib/actions/documents";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { useT } from "@/lib/i18n/context";

const fileInputClass =
  "block w-full text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500 dark:text-zinc-400";

export function UploadDocumentForm({ taskId }: { taskId: string }) {
  const t = useT();
  const [state, action] = useActionState(uploadDocument, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      {state?.error && <p className={errorClass}>{state.error}</p>}

      <div className="space-y-1">
        <label className={labelClass} htmlFor="file">
          {t.documentPage.file}
        </label>
        <input id="file" name="file" type="file" required className={fileInputClass} />
        <p className="text-xs text-zinc-400">{t.documentPage.maxSize}</p>
      </div>

      <div className="space-y-1">
        <label className={labelClass} htmlFor="name">
          {t.documentPage.simpleName}{" "}
          <span className="font-normal text-zinc-400">{t.documentPage.optional}</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder={t.documentPage.namePlaceholder}
          className={inputClass}
        />
      </div>

      <SubmitButton>{t.documentPage.upload}</SubmitButton>
    </form>
  );
}
