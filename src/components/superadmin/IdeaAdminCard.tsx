"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions/superadmin";
import { linkify } from "@/lib/linkify";

type IdeaStatusKey = "EN_ATTENTE" | "A_LETUDE" | "IMPLEMENTEE" | "ECARTEE";

type Response = { id: string; body: string; createdAt: string };

type Idea = {
  id: string;
  title: string;
  body: string | null;
  pseudo: string;
  votes: number;
  status: IdeaStatusKey;
  responses: Response[];
};

type Labels = {
  by: string; // « proposé par {pseudo} »
  votesLabel: string; // « {n} pouce(s) »
  statusHeading: string;
  status: Record<IdeaStatusKey, string>;
  responsesHeading: string;
  noResponses: string;
  responsePlaceholder: string;
  addResponse: string;
  deleteResponse: string;
  deleteResponseConfirm: string;
};

const STATUSES: IdeaStatusKey[] = ["EN_ATTENTE", "A_LETUDE", "IMPLEMENTEE", "ECARTEE"];

// Couleur de la pastille de statut (reprend la famille « état » des tâches).
const STATUS_ACTIVE: Record<IdeaStatusKey, string> = {
  EN_ATTENTE: "border-zinc-400 bg-zinc-600 text-white",
  A_LETUDE: "border-blue-600 bg-blue-600 text-white",
  IMPLEMENTEE: "border-green-600 bg-green-600 text-white",
  ECARTEE: "border-rose-600 bg-rose-600 text-white",
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

// Carte d'administration d'une idée (console superadmin) : en-tête (pseudo,
// titre, description, pouces), sélecteur de statut (public), et gestion des
// réponses officielles de l'équipe (ajout / suppression), elles aussi publiques.
export function IdeaAdminCard({
  idea,
  locale,
  labels,
  setStatus,
  addResponse,
  deleteResponse,
}: {
  idea: Idea;
  locale: string;
  labels: Labels;
  setStatus: (formData: FormData) => Promise<void>;
  addResponse: (prev: FormState, formData: FormData) => Promise<FormState>;
  deleteResponse: (formData: FormData) => Promise<void>;
}) {
  const [state, formAction] = useActionState(addResponse, undefined);
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <li className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {labels.by.replace("{pseudo}", idea.pseudo)}
          </p>
          <h2 className="mt-0.5 font-medium">{idea.title}</h2>
          {idea.body && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
              {linkify(idea.body)}
            </p>
          )}
        </div>
        <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
          {labels.votesLabel.replace("{n}", String(idea.votes))}
        </span>
      </div>

      {/* Statut (public) — chaque bouton soumet sa valeur. */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {labels.statusHeading}
        </p>
        <form action={setStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="ideaId" value={idea.id} />
          {STATUSES.map((s) => {
            const active = idea.status === s;
            return (
              <button
                key={s}
                type="submit"
                name="status"
                value={s}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  active
                    ? STATUS_ACTIVE[s]
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {labels.status[s]}
              </button>
            );
          })}
        </form>
      </div>

      {/* Réponses officielles (publiques). */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {labels.responsesHeading}
        </p>
        {idea.responses.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">{labels.noResponses}</p>
        ) : (
          <ul className="space-y-2">
            {idea.responses.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50"
              >
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                    {linkify(r.body)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {dateFmt.format(new Date(r.createdAt))}
                  </p>
                </div>
                <form
                  action={deleteResponse}
                  onSubmit={(e) => {
                    if (!window.confirm(labels.deleteResponseConfirm)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="commentId" value={r.id} />
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
                  >
                    {labels.deleteResponse}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {/* key dépend du nombre de réponses : vide le champ après un ajout réussi. */}
        <form key={`add-${idea.responses.length}`} action={formAction} className="space-y-2">
          <input type="hidden" name="ideaId" value={idea.id} />
          <textarea
            name="body"
            rows={2}
            placeholder={labels.responsePlaceholder}
            className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {state?.error && (
            <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
          )}
          <div className="flex justify-end">
            <SubmitButton label={labels.addResponse} />
          </div>
        </form>
      </div>
    </li>
  );
}
