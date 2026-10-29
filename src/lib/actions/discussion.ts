"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { ensureFollow, followMentioned } from "@/lib/follow";
import { logActivity } from "@/lib/activity";
import { rootTaskId } from "@/lib/actions/documents";

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

  const comment = await prisma.comment.create({
    data: { taskId: task.id, authorId: user.id, body: parsed.data.body },
  });

  await ensureFollow(user.id, task.id);
  await prisma.taskFollow.updateMany({
    where: { userId: user.id, taskId: task.id },
    data: { lastReadAt: new Date() },
  });

  // Journal : nouveau message (événement de la tâche). Le commentaire et ses
  // mentions partagent le même groupId → une seule ligne dans le flux.
  await logActivity({
    taskId: task.id,
    actorId: user.id,
    type: "COMMENT_ADDED",
    groupId: comment.id,
  });

  // Mentions sélectionnées : jetons @[identifiant] insérés par l'éditeur.
  // La personne mentionnée se met à suivre (= tâche favorite) si elle est membre,
  // et reçoit un événement ciblé « vous a mentionné ».
  const mentionIds = new Set(
    [...parsed.data.body.matchAll(/@\[([^\]]+)\]/g)].map((m) => m[1]),
  );
  for (const uid of mentionIds) {
    if (uid !== user.id && (await getMembership(uid, task.workspaceId))) {
      await ensureFollow(uid, task.id);
      const mentioned = await prisma.user.findUnique({
        where: { id: uid },
        select: { name: true },
      });
      await logActivity({
        taskId: task.id,
        actorId: user.id,
        type: "MENTIONED",
        targetUserId: uid,
        targetName: mentioned?.name ?? null,
        groupId: comment.id,
      });
    }
  }
  // Secours : mentions tapées à la main (@prénom) non sélectionnées.
  await followMentioned(parsed.data.body, task.workspaceId, task.id);

  // Documents référencés avec $ : jetons $[identifiant]. Un document du projet
  // ainsi cité est rattaché à la tâche (comme une mention fait suivre).
  const docIds = new Set(
    [...parsed.data.body.matchAll(/\$\[([^\]]+)\]/g)].map((m) => m[1]),
  );
  if (docIds.size > 0) {
    const projectTaskId = await rootTaskId(task.id);
    for (const did of docIds) {
      const doc = await prisma.document.findUnique({
        where: { id: did },
        select: { projectTaskId: true },
      });
      if (doc && doc.projectTaskId === projectTaskId) {
        await prisma.documentLink.upsert({
          where: { documentId_taskId: { documentId: did, taskId: task.id } },
          update: {},
          create: { documentId: did, taskId: task.id },
        });
      }
    }
  }

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

// Modifie un message existant (seul son auteur le peut) et le marque « modifié ».
export async function editComment(commentId: string, body: string): Promise<void> {
  const user = await requireUser();
  const trimmed = body.trim();
  if (!commentId || !trimmed || trimmed.length > 5000) return;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, taskId: true, task: { select: { workspaceId: true } } },
  });
  if (!comment) return;
  if (comment.authorId !== user.id) return;

  await prisma.comment.update({
    where: { id: comment.id },
    data: { body: trimmed, editedAt: new Date() },
  });

  // Les nouvelles mentions / références de document prennent effet.
  const mentionIds = new Set([...trimmed.matchAll(/@\[([^\]]+)\]/g)].map((m) => m[1]));
  for (const uid of mentionIds) {
    if (uid !== user.id && (await getMembership(uid, comment.task.workspaceId))) {
      await ensureFollow(uid, comment.taskId);
    }
  }
  const docIds = new Set([...trimmed.matchAll(/\$\[([^\]]+)\]/g)].map((m) => m[1]));
  if (docIds.size > 0) {
    const projectTaskId = await rootTaskId(comment.taskId);
    for (const did of docIds) {
      const doc = await prisma.document.findUnique({
        where: { id: did },
        select: { projectTaskId: true },
      });
      if (doc && doc.projectTaskId === projectTaskId) {
        await prisma.documentLink.upsert({
          where: { documentId_taskId: { documentId: did, taskId: comment.taskId } },
          update: {},
          create: { documentId: did, taskId: comment.taskId },
        });
      }
    }
  }

  revalidatePath(`/app/tasks/${comment.taskId}`);
}

// Ajoute une personne (membre de l'espace) comme suiveur de la tâche.
export async function addFollower(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!taskId || !userId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, workspaceId: true },
  });
  if (!task) return;
  if (!(await getMembership(user.id, task.workspaceId))) return;
  if (!(await getMembership(userId, task.workspaceId))) return;

  await ensureFollow(userId, task.id);
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
