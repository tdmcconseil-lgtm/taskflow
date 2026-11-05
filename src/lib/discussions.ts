import { prisma } from "@/lib/prisma";

export type DiscussionRow = {
  id: string;
  title: string;
  workspace: string;
  following: boolean;
  unread: boolean;
  // `preview` = corps du dernier message avec les tokens résolus en texte lisible
  // (@[id] → @Nom Prénom, $[id] → nom du document), pour l'aperçu de la liste.
  last: { createdAt: Date; body: string; preview: string; author: { name: string } };
};

// Tokens de mention : @[userId] (personne) et $[documentId] (document).
const TOKEN_RE = /([@$])\[([^\]]+)\]/g;

// Remplace les tokens d'un corps par du texte lisible (aperçu en clair, non
// cliquable — le rendu riche cliquable reste CommentBody côté fiche de tâche).
function resolvePreview(
  body: string,
  names: Map<string, string>,
  docNames: Map<string, string>,
): string {
  return body.replace(TOKEN_RE, (_full, sigil: string, id: string) =>
    sigil === "$" ? (docNames.get(id) ?? "document") : `@${names.get(id) ?? "inconnu"}`,
  );
}

// Discussions des tâches suivies (ou suivies par le passé), triées par message
// le plus récent. Filtrables par espace.
export async function getDiscussionRows(
  userId: string,
  workspaceId?: string,
): Promise<DiscussionRow[]> {
  const follows = await prisma.taskFollow.findMany({
    where: { userId, ...(workspaceId ? { task: { workspaceId } } : {}) },
    select: {
      following: true,
      lastReadAt: true,
      task: {
        select: {
          id: true,
          title: true,
          workspace: { select: { name: true } },
          comments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true, body: true, author: { select: { name: true } } },
          },
        },
      },
    },
  });

  const base = follows
    .filter((f) => f.task.comments.length > 0)
    .map((f) => {
      const last = f.task.comments[0];
      const unread = f.following && (!f.lastReadAt || last.createdAt > f.lastReadAt);
      return {
        id: f.task.id,
        title: f.task.title,
        workspace: f.task.workspace.name,
        following: f.following,
        unread,
        last,
      };
    });

  // Résolution des tokens de mention/document référencés par les derniers
  // messages, en une passe groupée, pour afficher l'aperçu en clair.
  const userIds = new Set<string>();
  const docIds = new Set<string>();
  for (const r of base) {
    TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TOKEN_RE.exec(r.last.body))) (m[1] === "$" ? docIds : userIds).add(m[2]);
  }
  const [users, docs] = await Promise.all([
    userIds.size
      ? prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    docIds.size
      ? prisma.document.findMany({ where: { id: { in: [...docIds] } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const docNameById = new Map(docs.map((d) => [d.id, d.name]));

  return base
    .map((r) => ({
      ...r,
      last: { ...r.last, preview: resolvePreview(r.last.body, nameById, docNameById) },
    }))
    .sort((a, b) => b.last.createdAt.getTime() - a.last.createdAt.getTime());
}
