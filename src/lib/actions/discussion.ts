"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { ensureFollow, followMentioned } from "@/lib/follow";

const commentSchema = z.object({
  taskId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
});

// Ajoute un commentaire. L'auteur suit alors la tâche (et a « lu » jusqu'ici),
// et les membres mentionnés avec @ se mettent à suivre.
export async function addComment(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = commentSchema.safeParse({
    taskId: formData.get("taskId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;

  const task = await prisma.task.findUnique({
    where: { id: parsed.data.taskId },
    select: { id: true, workspaceId: true },
  });
  if (!task) return;
  if (!(await getMembership(user.id, task.workspaceId))) return;

  await prisma.comment.create({
    data: { taskId: task.id, authorId: user.id, body: parsed.data.body },
  });

  await ensureFollow(user.id, task.id);
  await prisma.taskFollow.updateMany({
    where: { userId: user.id, taskId: task.id },
    data: { lastReadAt: new Date() },
  });

  // Mentions sélectionnées : jetons @[identifiant] insérés par l'éditeur.
  // La personne mentionnée se met à suivre (= tâche favorite) si elle est membre.
  const mentionIds = new Set(
    [...parsed.data.body.matchAll(/@\[([^\]]+)\]/g)].map((m) => m[1]),
  );
  for (const uid of mentionIds) {
    if (await getMembership(uid, task.workspaceId)) {
      await ensureFollow(uid, task.id);
    }
  }
  // Secours : mentions tapées à la main (@prénom) non sélectionnées.
  await followMentioned(parsed.data.body, task.workspaceId, task.id);

  revalidatePath(`/app/tasks/${task.id}`);
  revalidatePath("/app", "layout");
}

// Suivre / ne plus suivre — n'affecte que l'utilisateur courant. Le suivi n'est
// jamais supprimé (la discussion reste dans la liste), seul `following` change.
export async function toggleFollow(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, workspaceId: true },
  });
  if (!task) return;
  if (!(await getMembership(user.id, task.workspaceId))) return;

  const existing = await prisma.taskFollow.findUnique({
    where: { userId_taskId: { userId: user.id, taskId: task.id } },
  });
  if (existing) {
    await prisma.taskFollow.update({
      where: { id: existing.id },
      // En reprenant le suivi, on considère la discussion comme lue.
      data: existing.following ? { following: false } : { following: true, lastReadAt: new Date() },
    });
  } else {
    await prisma.taskFollow.create({
      data: { userId: user.id, taskId: task.id, following: true, lastReadAt: new Date() },
    });
  }

  revalidatePath(`/app/tasks/${task.id}`);
  revalidatePath("/app", "layout");
}

// Marque la discussion comme lue pour l'utilisateur courant (à l'ouverture).
export async function markRead(taskId: string): Promise<void> {
  const user = await requireUser();
  const updated = await prisma.taskFollow.updateMany({
    where: { userId: user.id, taskId },
    data: { lastReadAt: new Date() },
  });
  if (updated.count > 0) revalidatePath("/app", "layout");
}
