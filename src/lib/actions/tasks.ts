"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { ensureFollow } from "@/lib/follow";
import { logActivity } from "@/lib/activity";
import { formatDate } from "@/lib/labels";

export type FormState = { error?: string } | undefined;

const STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

// Charge une tâche (espace + parent) et vérifie l'appartenance de l'utilisateur.
async function loadTaskForUser(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, workspaceId: true, parentId: true },
  });
  if (!task) return null;
  const membership = await getMembership(userId, task.workspaceId);
  if (!membership) return null;
  return task;
}

const createSchema = z.object({
  workspaceId: z.string().optional(),
  parentId: z.string().optional(),
  title: z.string().trim().min(1, "Le titre est requis."),
  description: z.string().trim().max(5000).optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  dueDate: z.string().optional(),
});

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse({
    workspaceId: formData.get("workspaceId") || undefined,
    parentId: formData.get("parentId") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    assigneeId: formData.get("assigneeId") || undefined,
    priority: formData.get("priority") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  // Une tâche est soit rattachée à une tâche parente (sous-tâche), soit
  // directement à l'espace (tâche de 1er niveau = « projet »).
  let workspaceId: string;
  let parentId: string | null = null;

  if (parsed.data.parentId) {
    const parent = await prisma.task.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, workspaceId: true },
    });
    if (!parent) return { error: "Tâche parente introuvable." };
    if (!(await getMembership(user.id, parent.workspaceId))) {
      return { error: "Accès refusé." };
    }
    workspaceId = parent.workspaceId;
    parentId = parent.id;
  } else {
    if (!parsed.data.workspaceId) return { error: "Espace de travail manquant." };
    if (!(await getMembership(user.id, parsed.data.workspaceId))) {
      return { error: "Vous n'avez pas accès à cet espace de travail." };
    }
    workspaceId = parsed.data.workspaceId;
  }

  // L'assigné doit être membre de l'espace.
  let assigneeId: string | null = null;
  if (parsed.data.assigneeId) {
    if (!(await getMembership(parsed.data.assigneeId, workspaceId))) {
      return { error: "La personne assignée doit être membre de l'espace de travail." };
    }
    assigneeId = parsed.data.assigneeId;
  }

  let dueDate: Date | null = null;
  if (parsed.data.dueDate) {
    const d = new Date(parsed.data.dueDate);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      workspaceId,
      createdById: user.id,
      assigneeId,
      dueDate,
      parentId,
    },
  });

  // Suivi automatique : le créateur et l'assigné suivent la tâche.
  await ensureFollow(user.id, task.id);
  if (assigneeId) await ensureFollow(assigneeId, task.id);

  // Journal : création (+ sous-tâche ajoutée côté parent).
  await logActivity({ taskId: task.id, actorId: user.id, type: "CREATED" });
  if (parentId) {
    await logActivity({
      taskId: parentId,
      actorId: user.id,
      type: "SUBTASK_ADDED",
      targetName: task.title,
    });
  }

  revalidatePath("/app");
  revalidatePath(`/app/workspaces/${workspaceId}`);
  if (parentId) {
    revalidatePath(`/app/tasks/${parentId}`);
    redirect(`/app/tasks/${parentId}`);
  }
  redirect(`/app/tasks/${task.id}`);
}

const updateSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1, "Le titre est requis."),
  priority: z.enum(PRIORITIES),
});

export async function updateTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateSchema.safeParse({
    taskId: formData.get("taskId"),
    title: formData.get("title"),
    priority: formData.get("priority") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const old = await prisma.task.findUnique({
    where: { id: parsed.data.taskId },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      description: true,
      priority: true,
      dueDate: true,
      assigneeId: true,
      assignee: { select: { name: true } },
    },
  });
  if (!old) return { error: "Tâche introuvable." };
  if (!(await getMembership(user.id, old.workspaceId))) return { error: "Accès refusé." };

  // Champs facultatifs : une valeur vide efface le champ.
  const description = String(formData.get("description") ?? "").trim() || null;

  let assigneeId: string | null = null;
  let assigneeName: string | null = null;
  const rawAssignee = String(formData.get("assigneeId") ?? "").trim();
  if (rawAssignee) {
    if (!(await getMembership(rawAssignee, old.workspaceId))) {
      return { error: "La personne assignée doit être membre de l'espace de travail." };
    }
    assigneeId = rawAssignee;
    const a = await prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true } });
    assigneeName = a?.name ?? null;
  }

  let dueDate: Date | null = null;
  const rawDue = String(formData.get("dueDate") ?? "").trim();
  if (rawDue) {
    const d = new Date(rawDue);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }

  await prisma.task.update({
    where: { id: old.id },
    data: { title: parsed.data.title, description, priority: parsed.data.priority, assigneeId, dueDate },
  });

  // Être assigné à une tâche la fait suivre.
  if (assigneeId) await ensureFollow(assigneeId, old.id);

  // Journal : une entrée par champ réellement modifié.
  if (old.title !== parsed.data.title) {
    await logActivity({ taskId: old.id, actorId: user.id, type: "TITLE_CHANGED", fromValue: old.title, toValue: parsed.data.title });
  }
  if ((old.description ?? null) !== description) {
    await logActivity({ taskId: old.id, actorId: user.id, type: "DESCRIPTION_CHANGED" });
  }
  if (old.priority !== parsed.data.priority) {
    await logActivity({ taskId: old.id, actorId: user.id, type: "PRIORITY_CHANGED", fromValue: old.priority, toValue: parsed.data.priority });
  }
  const oldDue = old.dueDate ? old.dueDate.getTime() : null;
  const newDue = dueDate ? dueDate.getTime() : null;
  if (oldDue !== newDue) {
    await logActivity({ taskId: old.id, actorId: user.id, type: "DUE_DATE_CHANGED", fromValue: formatDate(old.dueDate), toValue: formatDate(dueDate) });
  }
  if ((old.assigneeId ?? null) !== (assigneeId ?? null)) {
    await logActivity({ taskId: old.id, actorId: user.id, type: "ASSIGNED", fromValue: old.assignee?.name ?? null, targetName: assigneeName });
  }

  revalidatePath(`/app/tasks/${old.id}`);
  revalidatePath("/app");
  redirect(`/app/tasks/${old.id}`);
}

const statusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(STATUSES),
});

export async function setTaskStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = statusSchema.safeParse({
    taskId: formData.get("taskId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Données invalides." };

  const task = await loadTaskForUser(user.id, parsed.data.taskId);
  if (!task) return { error: "Tâche introuvable ou accès refusé." };

  const current = await prisma.task.findUnique({
    where: { id: task.id },
    select: { status: true },
  });

  // On ne peut pas clôturer une tâche tant qu'elle a des sous-tâches non terminées.
  if (parsed.data.status === "DONE") {
    const unfinished = await prisma.task.count({
      where: { parentId: task.id, status: { not: "DONE" } },
    });
    if (unfinished > 0) {
      return {
        error: `Impossible de clôturer : ${unfinished} sous-tâche${
          unfinished > 1 ? "s" : ""
        } non terminée${unfinished > 1 ? "s" : ""}.`,
      };
    }
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: parsed.data.status,
      completedAt: parsed.data.status === "DONE" ? new Date() : null,
    },
  });

  if (current && current.status !== parsed.data.status) {
    await logActivity({
      taskId: task.id,
      actorId: user.id,
      type: "STATUS_CHANGED",
      fromValue: current.status,
      toValue: parsed.data.status,
    });
  }

  revalidatePath(`/app/tasks/${task.id}`);
  if (task.parentId) revalidatePath(`/app/tasks/${task.parentId}`);
  else revalidatePath(`/app/workspaces/${task.workspaceId}`);
  revalidatePath("/app");
  return undefined;
}

export async function deleteTask(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  const task = await loadTaskForUser(user.id, taskId);
  if (!task) return;

  const info = await prisma.task.findUnique({
    where: { id: task.id },
    select: { title: true },
  });

  await prisma.task.delete({ where: { id: task.id } });

  // Journal : sous-tâche supprimée (consigné sur le parent, qui subsiste).
  if (task.parentId && info) {
    await logActivity({
      taskId: task.parentId,
      actorId: user.id,
      type: "SUBTASK_REMOVED",
      targetName: info.title,
    });
  }

  revalidatePath("/app");
  // Retour au parent (si sous-tâche) ou à l'espace (si tâche de 1er niveau).
  if (task.parentId) {
    revalidatePath(`/app/tasks/${task.parentId}`);
    redirect(`/app/tasks/${task.parentId}`);
  }
  revalidatePath(`/app/workspaces/${task.workspaceId}`);
  redirect(`/app/workspaces/${task.workspaceId}`);
}
