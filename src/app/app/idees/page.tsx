import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { ButtonLink } from "@/components/Button";
import { IdeaList } from "@/components/IdeaList";
import { toggleIdeaVote, deleteIdea } from "@/lib/actions/ideas";

export const metadata: Metadata = { title: "Idées — getRIDA" };

// Module Idées : liste transverse à l'application, triée par nombre de pouces
// (décroissant). On ne renvoie jamais l'identité réelle de l'auteur — seulement
// son pseudo et les compteurs. `mine` (calculé côté serveur) permet à l'auteur
// de supprimer sa propre idée sans exposer qui l'a écrite.
export default async function IdeasPage() {
  const user = await requireUser();
  const t = await getDictionary();

  const ideas = await prisma.idea.findMany({
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      body: true,
      pseudo: true,
      authorId: true,
      _count: { select: { votes: true } },
      // Pouce de l'utilisateur courant uniquement (pour l'état « voté »).
      votes: { where: { userId: user.id }, select: { id: true } },
    },
  });

  const items = ideas.map((i) => ({
    id: i.id,
    title: i.title,
    body: i.body,
    pseudo: i.pseudo,
    votes: i._count.votes,
    voted: i.votes.length > 0,
    mine: i.authorId === user.id,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.ideas.title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.ideas.desc}</p>
        </div>
        <ButtonLink href="/app/idees/new" className="shrink-0">
          {t.ideas.new}
        </ButtonLink>
      </div>

      <IdeaList
        ideas={items}
        toggleVote={toggleIdeaVote}
        deleteIdea={deleteIdea}
        labels={{
          empty: t.ideas.empty,
          by: t.ideas.by,
          vote: t.ideas.vote,
          voted: t.ideas.voted,
          votesAria: t.ideas.votesAria,
          showDescription: t.ideas.showDescription,
          hideDescription: t.ideas.hideDescription,
          delete: t.ideas.delete,
          deleteConfirm: t.ideas.deleteConfirm,
        }}
      />
    </div>
  );
}
