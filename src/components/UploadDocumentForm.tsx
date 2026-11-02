"use client";

import { useActionState, useRef, useState } from "react";
import { uploadDocument, createLinkDocument } from "@/lib/actions/documents";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass, errorClass } from "@/components/ui";
import { useT } from "@/lib/i18n/context";

// Le sélecteur de fichier reste gris : un seul bouton bleu par écran (le submit
// « Téléverser »), qui répond à Cmd/Ctrl+Entrée.
const fileInputClass =
  "block w-full text-sm text-zinc-600 dark:text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-300 dark:file:bg-zinc-700 dark:file:text-zinc-200 dark:hover:file:bg-zinc-600";

function tabClass(active: boolean): string {
  return `flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
    active
      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
  }`;
}

// Deux modes : téléverser un fichier (comportement historique) ou ajouter un
// lien externe (une URL, sans fichier stocké ni consommation de quota).
export function UploadDocumentForm({ taskId }: { taskId: string }) {
  const t = useT();
  const [mode, setMode] = useState<"file" | "link">("file");
  const [fileState, fileAction] = useActionState(uploadDocument, undefined);
  const [linkState, linkAction] = useActionState(createLinkDocument, undefined);

  // Glisser-déposer : le fichier déposé alimente le même <input type="file">,
  // l'action serveur est inchangée. Click « Choisir un fichier » reste possible.
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function assignFile(file: File | undefined) {
    if (!file || !fileRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    fileRef.current.files = dt.files;
    setFileName(file.name);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <button type="button" onClick={() => setMode("file")} className={tabClass(mode === "file")}>
          {t.documentPage.tabFile}
        </button>
        <button type="button" onClick={() => setMode("link")} className={tabClass(mode === "link")}>
          {t.documentPage.tabLink}
        </button>
      </div>

      {mode === "file" ? (
        <form action={fileAction} className="space-y-4">
          <input type="hidden" name="taskId" value={taskId} />
          {fileState?.error && <p className={errorClass}>{fileState.error}</p>}

          <div className="space-y-1">
            <label className={labelClass} htmlFor="file">
              {t.documentPage.file}
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                assignFile(e.dataTransfer.files[0]);
              }}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition ${
                dragOver
                  ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/30"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {fileName ? `📎 ${fileName}` : t.documentPage.dropHint}
              </p>
              <input
                ref={fileRef}
                id="file"
                name="file"
                type="file"
                required
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                className={`${fileInputClass} w-auto`}
              />
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.documentPage.maxSize}</p>
          </div>

          <div className="space-y-1">
            <label className={labelClass} htmlFor="name">
              {t.documentPage.simpleName}{" "}
              <span className="font-normal text-zinc-400 dark:text-zinc-500">{t.documentPage.optional}</span>
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
      ) : (
        <form action={linkAction} className="space-y-4">
          <input type="hidden" name="taskId" value={taskId} />
          {linkState?.error && <p className={errorClass}>{linkState.error}</p>}

          <div className="space-y-1">
            <label className={labelClass} htmlFor="url">
              {t.documentPage.linkUrl}
            </label>
            <input
              id="url"
              name="url"
              type="url"
              required
              placeholder={t.documentPage.urlPlaceholder}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass} htmlFor="link-name">
              {t.documentPage.simpleName}{" "}
              <span className="font-normal text-zinc-400 dark:text-zinc-500">{t.documentPage.optional}</span>
            </label>
            <input
              id="link-name"
              name="name"
              type="text"
              placeholder={t.documentPage.linkNamePlaceholder}
              className={inputClass}
            />
          </div>

          <SubmitButton>{t.documentPage.addLink}</SubmitButton>
        </form>
      )}
    </div>
  );
}
