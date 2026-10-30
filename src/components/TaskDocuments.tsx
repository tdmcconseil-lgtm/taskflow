"use client";

import Link from "next/link";
import { detachDocument } from "@/lib/actions/documents";
import { useT } from "@/lib/i18n/context";

export type DocItem = { id: string; name: string; fileName: string };

// Section « Documents » d'une fiche de tâche. Sur la tâche racine (le projet),
// on montre tout le pool du projet ; sur une sous-tâche, les documents liés.
export function TaskDocuments({
  taskId,
  isTopLevel,
  linked,
  pool,
}: {
  taskId: string;
  isTopLevel: boolean;
  linked: DocItem[];
  pool: DocItem[];
}) {
  const t = useT();
  const items = isTopLevel ? pool : linked;
  const heading = isTopLevel ? t.documents.projectDocuments : t.documents.taskDocuments;
  const empty = isTopLevel ? t.documents.emptyProject : t.documents.emptyTask;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{heading}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/tasks/${taskId}/documents/new`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            {t.documents.upload}
          </Link>
          {!isTopLevel && (
            <Link
              href={`/app/tasks/${taskId}/documents/attach`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {t.documents.attachFromProject}
            </Link>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm italic text-zinc-400 dark:text-zinc-300">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 bg-white p-3 dark:bg-zinc-900"
            >
              <Link
                href={`/app/documents/${d.id}`}
                className="flex min-w-0 items-center gap-2 text-sm hover:underline"
              >
                <span aria-hidden>📄</span>
                <span className="truncate font-medium">{d.name}</span>
                <span className="truncate text-xs text-zinc-400 dark:text-zinc-300">{d.fileName}</span>
              </Link>
              {!isTopLevel && (
                <form action={detachDocument}>
                  <input type="hidden" name="taskId" value={taskId} />
                  <input type="hidden" name="documentId" value={d.id} />
                  <button
                    type="submit"
                    title={t.documents.detachTitle}
                    className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-400 dark:text-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    {t.documents.detach}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
