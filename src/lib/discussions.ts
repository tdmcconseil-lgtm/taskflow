import { prisma } from "@/lib/prisma";

export type DiscussionRow = {
  id: string;
  title: string;
  workspace: string;
  following: boolean;
  unread: boolean;
  last: { createdAt: Date; body: string; author: { name: string } };
};

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

  return follows
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
    })
    .sort((a, b) => b.last.createdAt.getTime() - a.last.createdAt.getTime());
}
