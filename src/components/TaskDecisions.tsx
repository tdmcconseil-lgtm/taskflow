"use client";

import Link from "next/link";
import { setDecisionProject, deleteDecision } from "@/lib/actions/decisions";
import { formatDate } from "@/lib/labels";
import { useT } from "@/lib/i18n/context";

export type DecisionItem = {
  id: string;
  content: string;
  isProjectDecision: boolean;
  createdAt: Date;
  authorName: string;
  document: { id: string; name: string } | null;
};

export type ProjectDecisionItem = DecisionItem & {
  taskId: string;
  taskTitle: string;
};

// Section « Décisions » d'une fiche de tâche. Chaque tâche porte sa propre liste
// (avec le bouton « Ajouter ») ; sur la tâche racine (le projet), on affiche en
// plus la remontée des décisions marquées « décision projet » de tout le projet.
export function TaskDecisions({
  taskId,
  isTopLevel,
  decisions,
  projectDecisions,
}: {
  taskId: string;
  isTopLevel: boolean;
  decisions: DecisionItem[];
  projectDecisions: ProjectDecisionItem[];
}) {
  const t = useT();
  return (
    <div className="space-y-8">
      {isTopLevel && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{t.decisions.projectDecisions}</h2>
            <p className="text-sm text-zinc-500">{t.decisions.projectDecisionsDesc}</p>
          </div>

          {projectDecisions.length === 0 ? (
            <p className="text-sm italic text-zinc-400">{t.decisions.noProjectDecisions}</p>
          ) : (
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {projectDecisions.map((d) => (
                <li key={d.id} className="space-y-1 bg-white p-3 dark:bg-zinc-900">
                  <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                    {d.content}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                    <span>
                      {d.authorName} · {formatDate(d.createdAt)} · {t.decisions.inTask}{" "}
                      <Link href={`/app/tasks/${d.taskId}`} className="hover:underline">
                        {d.taskTitle}
                      </Link>
                    </span>
                    {d.document && (
                      <Link
                        href={`/app/documents/${d.document.id}`}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <span aria-hidden>📄</span>
                        <span className="truncate">{d.document.name}</span>
                      </Link>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {isTopLevel ? t.decisions.taskDecisionsTop : t.decisions.taskDecisions}
          </h2>
          <Link
            href={`/app/tasks/${taskId}/decisions/new`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            {t.decisions.add}
          </Link>
        </div>

        {decisions.length === 0 ? (
          <p className="text-sm italic text-zinc-400">{t.decisions.noDecisions}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {decisions.map((d) => (
              <li key={d.id} className="space-y-2 bg-white p-3 dark:bg-zinc-900">
                <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                  {d.content}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                  <span>
                    {d.authorName} · {formatDate(d.createdAt)}
                  </span>
                  {d.document && (
                    <Link
                      href={`/app/documents/${d.document.id}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <span aria-hidden>📄</span>
                      <span className="truncate">{d.document.name}</span>
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={setDecisionProject}>
                    <input type="hidden" name="decisionId" value={d.id} />
                    <input type="hidden" name="value" value={d.isProjectDecision ? "0" : "1"} />
                    <button
                      type="submit"
                      title={d.isProjectDecision ? t.decisions.unmarkTitle : t.decisions.markTitle}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        d.isProjectDecision
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span aria-hidden>🏷️</span>
                      <span>
                        {d.isProjectDecision
                          ? t.decisions.projectDecision
                          : t.decisions.markProjectDecision}
                      </span>
                    </button>
                  </form>
                  <form action={deleteDecision}>
                    <input type="hidden" name="decisionId" value={d.id} />
                    <button
                      type="submit"
                      title={t.decisions.deleteTitle}
                      className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                      {t.decisions.delete}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
