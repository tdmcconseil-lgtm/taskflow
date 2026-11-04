import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { formatDate } from "@/lib/labels";
import { ButtonLink } from "@/components/Button";
import { IdeaList } from "@/components/IdeaList";
import { IdeaControls, type IdeaSort, type IdeaFilter } from "@/components/IdeaControls";
import { toggleIdeaVote, deleteIdea } from "@/lib/actions/ideas";

export const metadata: Metadata = { title: "Idées — getRIDA" };

// Module Idées : liste transverse à l'application. Tri (pouces / récentes /
// anciennes) et filtre (toutes / miennes / sauf miennes) via l'URL. On ne
// renvoie jamais l'identité réelle de l'auteur — seulement son pseudo et les
// compteurs ; `mine` (calculé côté serveur) sert à la suppression et au filtre.
export default async function IdeasPage({ searchParams }: PageProps<"/app/idees">) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const sp = await searchParams;

  const sort: IdeaSort =
    sp.sort === "recent" || sp.sort === "oldest" ? sp.sort : "votes";
  const filter: IdeaFilter =
    sp.filter === "mine" || sp.filter === "others" ? sp.filter : "all";

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pseudo: true },
  });

  const ideas = await prisma.idea.findMany({
    where:
      filter === "mine"
        ? { authorId: user.id }
        : filter === "others"
          ? { authorId: { not: user.id } }
          : {},
    orderBy:
      sort === "recent"
        ? [{ createdAt: "desc" }]
        : sort === "oldest"
          ? [{ createdAt: "asc" }]
          : [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      body: true,
      pseudo: true,
      status: true,
      authorId: true,
      _count: { select: { votes: true } },
      // Pouce de l'utilisateur courant uniquement (pour l'état « voté »).
      votes: { where: { userId: user.id }, select: { id: true } },
      // Réponses officielles de l'équipe (publiques), les plus anciennes d'abord.
      comments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true },
      },
    },
  });

  const items = ideas.map((i) => ({
    id: i.id,
    title: i.title,
    body: i.body,
    pseudo: i.pseudo,
    status: i.status,
    votes: i._count.votes,
    voted: i.votes.length > 0,
    mine: i.authorId === user.id,
    responses: i.comments.map((c) => ({
      id: c.id,
      body: c.body,
      date: formatDate(c.createdAt, locale),
    })),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.ideas.title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.ideas.desc}</p>
          {dbUser?.pseudo && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {t.ideas.yourPseudo.replace("{pseudo}", dbUser.pseudo)}{" "}
              <span className="text-zinc-400 dark:text-zinc-500">{t.ideas.pseudoEditProfile}</span>
            </p>
          )}
        </div>
        <ButtonLink href="/app/idees/new" className="shrink-0">
          {t.ideas.new}
        </ButtonLink>
      </div>

      <IdeaControls sort={sort} filter={filter} />

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
          status: t.ideas.status,
          teamResponse: t.ideas.teamResponse,
        }}
      />
    </div>
  );
}
