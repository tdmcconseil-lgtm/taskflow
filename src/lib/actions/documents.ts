"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { getDictionary } from "@/lib/i18n/server";

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

export type DocFormState = { error?: string } | undefined;

// Remonte jusqu'à la tâche racine (le « projet ») d'une tâche donnée.
export async function rootTaskId(taskId: string): Promise<string> {
  let currentId = taskId;
  for (let i = 0; i < 50; i++) {
    const t = await prisma.task.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!t || !t.parentId) return currentId;
    currentId = t.parentId;
  }
  return currentId;
}

// Nom simplifié par défaut = nom de fichier sans extension.
function defaultName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return base || fileName;
}

async function loadTask(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, workspaceId: true },
  });
  if (!task) return null;
  if (!(await getMembership(userId, task.workspaceId))) return null;
  return task;
}

// Téléverse un document : il est ajouté au pool du projet et lié à la tâche.
export async function uploadDocument(
  _prev: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const user = await requireUser();
  const t = await getDictionary();
  const taskId = String(formData.get("taskId") ?? "");
  const task = await loadTask(user.id, taskId);
  if (!task) return { error: t.errors.taskNotFoundOrDenied };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t.errors.chooseFile };
  }
  if (file.size > MAX_SIZE) {
    return { error: t.errors.fileTooLarge };
  }

  const providedName = String(formData.get("name") ?? "").trim();
  const bytes = Buffer.from(await file.arrayBuffer());
  const projectTaskId = await rootTaskId(task.id);

  const doc = await prisma.document.create({
    data: {
      name: providedName || defaultName(file.name),
      fileName: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      data: bytes,
      workspaceId: task.workspaceId,
      projectTaskId,
      uploadedById: user.id,
    },
  });
  await prisma.documentLink.create({ data: { documentId: doc.id, taskId: task.id } });

  revalidatePath(`/app/tasks/${task.id}`);
  revalidatePath(`/app/tasks/${projectTaskId}`);
  redirect(`/app/tasks/${task.id}`);
}

// Joint un document existant du projet à la tâche.
export async function attachDocument(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const task = await loadTask(user.id, taskId);
  if (!task) return;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, projectTaskId: true },
  });
  if (!doc) return;
  // Le document doit appartenir au même projet que la tâche.
  const projectTaskId = await rootTaskId(task.id);
  if (doc.projectTaskId !== projectTaskId) return;

  await prisma.documentLink.upsert({
    where: { documentId_taskId: { documentId: doc.id, taskId: task.id } },
    update: {},
    create: { documentId: doc.id, taskId: task.id },
  });

  revalidatePath(`/app/tasks/${task.id}`);
  redirect(`/app/tasks/${task.id}`);
}

// Retire le lien entre un document et une tâche (ne supprime pas le document).
export async function detachDocument(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const task = await loadTask(user.id, taskId);
  if (!task) return;

  await prisma.documentLink.deleteMany({ where: { documentId, taskId: task.id } });
  revalidatePath(`/app/tasks/${task.id}`);
}

// Renomme le document (nom simplifié affiché).
export async function renameDocument(
  _prev: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const user = await requireUser();
  const t = await getDictionary();
  const documentId = String(formData.get("documentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: t.errors.nameRequired };

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { workspaceId: true },
  });
  if (!doc) return { error: t.errors.documentNotFound };
  if (!(await getMembership(user.id, doc.workspaceId))) return { error: t.errors.accessDenied };

  await prisma.document.update({ where: { id: documentId }, data: { name } });
  revalidatePath(`/app/documents/${documentId}`);
  return { error: undefined };
}

// Supprime définitivement le document (et tous ses liens, en cascade).
export async function deleteDocument(formData: FormData): Promise<void> {
  const user = await requireUser();
  const documentId = String(formData.get("documentId") ?? "");
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { workspaceId: true, projectTaskId: true },
  });
  if (!doc) return;
  if (!(await getMembership(user.id, doc.workspaceId))) return;

  await prisma.document.delete({ where: { id: documentId } });
  revalidatePath(`/app/tasks/${doc.projectTaskId}`);
  redirect(`/app/tasks/${doc.projectTaskId}`);
}
