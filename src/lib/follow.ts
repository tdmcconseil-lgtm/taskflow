import { prisma } from "@/lib/prisma";

// Fait suivre une tâche à un utilisateur (idempotent ; réactive un suivi arrêté).
export async function ensureFollow(userId: string, taskId: string): Promise<void> {
  await prisma.taskFollow.upsert({
    where: { userId_taskId: { userId, taskId } },
    create: { userId, taskId, following: true },
    update: { following: true },
  });
}

// À partir du corps d'un commentaire, fait suivre la tâche aux membres mentionnés
// avec @ (match sur le prénom, la partie locale de l'email ou l'email complet).
export async function followMentioned(
  body: string,
  workspaceId: string,
  taskId: string,
): Promise<void> {
  const tokens = new Set(
    [...body.matchAll(/@([\p{L}\p{N}._-]+)/gu)].map((m) => m[1].toLowerCase()),
  );
  if (tokens.size === 0) return;

  const members = await prisma.membership.findMany({
    where: { workspaceId },
    select: { user: { select: { id: true, name: true, email: true } } },
  });

  for (const { user } of members) {
    const handles = new Set(
      [
        user.name.split(/\s+/)[0]?.toLowerCase(),
        user.email.split("@")[0]?.toLowerCase(),
        user.email.toLowerCase(),
      ].filter(Boolean),
    );
    if ([...tokens].some((t) => handles.has(t))) {
      await ensureFollow(user.id, taskId);
    }
  }
}
