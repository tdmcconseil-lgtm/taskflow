"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type Idea = {
  id: string;
  title: string;
  body: string | null;
  pseudo: string;
  votes: number;
  voted: boolean;
  mine: boolean;
};

type Labels = {
  empty: string;
  by: string; // « proposé par {pseudo} »
  vote: string;
  voted: string;
  votesAria: string; // « {n} pouce(s) »
  showDescription: string;
  hideDescription: string;
  delete: string;
  deleteConfirm: string;
};

// Bouton pouce : met en avant l'état « voté » (indigo plein) et se désactive le
// temps de la bascule. useFormStatus suit l'envoi du <form> parent.
function VoteButton({ voted, count, labels }: { voted: boolean; count: number; labels: Labels }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={voted}
      aria-label={labels.votesAria.replace("{n}", String(count))}
      title={voted ? labels.voted : labels.vote}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition disabled:opacity-60 ${
        voted
          ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500"
          : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      <span aria-hidden>👍</span>
      <span>{count}</span>
    </button>
  );
}

// Liste des idées. Chaque carte : pseudo de l'auteur, titre, description
// repliable (si présente), compteur + bouton pouce, et bouton supprimer pour
// l'auteur. Les actions serveur (vote, suppression) sont passées en props.
export function IdeaList({
  ideas,
  toggleVote,
  deleteIdea,
  labels,
}: {
  ideas: Idea[];
  toggleVote: (formData: FormData) => Promise<void>;
  deleteIdea: (formData: FormData) => Promise<void>;
  labels: Labels;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (ideas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {labels.empty}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {ideas.map((idea) => {
        const isOpen = open[idea.id] ?? false;
        return (
          <li
            key={idea.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {labels.by.replace("{pseudo}", idea.pseudo)}
                </p>
                <h2 className="mt-0.5 font-medium">{idea.title}</h2>
                {idea.body && (
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [idea.id]: !isOpen }))}
                    aria-expanded={isOpen}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    <span className={`inline-block transition ${isOpen ? "rotate-90" : ""}`}>▸</span>
                    {isOpen ? labels.hideDescription : labels.showDescription}
                  </button>
                )}
                {idea.body && isOpen && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                    {idea.body}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <form action={toggleVote}>
                  <input type="hidden" name="ideaId" value={idea.id} />
                  <VoteButton voted={idea.voted} count={idea.votes} labels={labels} />
                </form>
                {idea.mine && (
                  <form
                    action={deleteIdea}
                    onSubmit={(e) => {
                      if (!window.confirm(labels.deleteConfirm)) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="ideaId" value={idea.id} />
                    <button
                      type="submit"
                      className="text-xs text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
                    >
                      {labels.delete}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
