"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { canAccessTask } from "@/lib/access";
import { getDictionary, zodError } from "@/lib/i18n/server";
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
  if (!(await canAccessTask(userId, task.id))) return null;
  return task;
}

const createSchema = z.object({
  workspaceId: z.string().optional(),
  parentId: z.string().optional(),
  title: z.string().trim().min(1, "titleRequired"),
  description: z.string().trim().max(5000).optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  // Visibilité : utile uniquement pour un projet (tâche de 1er niveau).
  visibility: z.enum(["WORKSPACE", "RESTRICTED"]).optional(),
  dueDate: z.string().optional(),
});

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const t = await getDictionary();
  const parsed = createSchema.safeParse({
    workspaceId: formData.get("workspaceId") || undefined,
    parentId: formData.get("parentId") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    assigneeId: formData.get("assigneeId") || undefined,
    priority: formData.get("priority") || undefined,
    visibility: formData.get("visibility") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
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
    if (!parent) return { error: t.errors.parentNotFound };
    if (!(await getMembership(user.id, parent.workspaceId))) {
      return { error: t.errors.accessDenied };
    }
    if (!(await canAccessTask(user.id, parent.id))) {
      return { error: t.errors.accessDeniedProject };
    }
    workspaceId = parent.workspaceId;
    parentId = parent.id;
  } else {
    if (!parsed.data.workspaceId) return { error: t.errors.workspaceMissing };
    if (!(await getMembership(user.id, parsed.data.workspaceId))) {
      return { error: t.errors.noWorkspaceAccess };
    }
    workspaceId = parsed.data.workspaceId;
  }

  // L'assigné doit être membre de l'espace.
  let assigneeId: string | null = null;
  if (parsed.data.assigneeId) {
    if (!(await getMembership(parsed.data.assigneeId, workspaceId))) {
      return { error: t.errors.assigneeMustBeMember };
    }
    assigneeId = parsed.data.assigneeId;
  }

  let dueDate: Date | null = null;
  if (parsed.data.dueDate) {
    const d = new Date(parsed.data.dueDate);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }

  // Nouvelle tâche ajoutée en fin de liste de sa fratrie.
  const position = await prisma.task.count({
    where: parentId ? { parentId } : { workspaceId, parentId: null },
  });

  // Visibilité : seulement pour un projet (tâche racine). Par défaut « restreint ».
  const isProject = parentId === null;
  const visibility =
    isProject && parsed.data.visibility === "WORKSPACE" ? "WORKSPACE" : "RESTRICTED";

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
      position,
      ...(isProject ? { visibility } : {}),
    },
  });

  // Projet restreint : accorder l'accès aux membres choisis (membres actifs de
  // l'espace, hors le créateur qui a toujours accès) et les faire suivre.
  if (isProject && visibility === "RESTRICTED") {
    const memberIds = formData
      .getAll("members")
      .map((v) => String(v))
      .filter(Boolean);
    if (memberIds.length > 0) {
      const valid = await prisma.membership.findMany({
        where: { workspaceId, deactivatedAt: null, userId: { in: memberIds } },
        select: { userId: true },
      });
      const grantIds = valid.map((m) => m.userId).filter((id) => id !== user.id);
      if (grantIds.length > 0) {
        await prisma.projectAccess.createMany({
          data: grantIds.map((userId) => ({ taskId: task.id, userId })),
          skipDuplicates: true,
        });
        for (const id of grantIds) await ensureFollow(id, task.id);
      }
    }
  }

  // Suivi automatique : le créateur et l'assigné suivent la tâche.
  await ensureFollow(user.id, task.id);
  if (assigneeId) await ensureFollow(assigneeId, task.id);

  // Journal : création (+ sous-tâche ajoutée côté parent).
  await logActivity({ taskId: task.id, actorId: user.id, type: "CREATED" });
  // Tâche créée déjà assignée à quelqu'un d'autre : événement adressé à l'assigné
  // (comme une assignation ultérieure), pour qu'il puisse en être notifié.
  if (assigneeId && assigneeId !== user.id) {
    const a = await prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true } });
    await logActivity({
      taskId: task.id,
      actorId: user.id,
      type: "ASSIGNED",
      targetName: a?.name ?? null,
      targetUserId: assigneeId,
    });
  }
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
  title: z.string().trim().min(1, "titleRequired"),
  priority: z.enum(PRIORITIES),
});

export async function updateTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const t = await getDictionary();
  const parsed = updateSchema.safeParse({
    taskId: formData.get("taskId"),
    title: formData.get("title"),
    priority: formData.get("priority") || undefined,
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
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
  if (!old) return { error: t.errors.taskNotFound };
  if (!(await getMembership(user.id, old.workspaceId))) return { error: t.errors.accessDenied };
  if (!(await canAccessTask(user.id, old.id))) return { error: t.errors.accessDenied };

  // Champs facultatifs : une valeur vide efface le champ.
  const description = String(formData.get("description") ?? "").trim() || null;

  let assigneeId: string | null = null;
  let assigneeName: string | null = null;
  const rawAssignee = String(formData.get("assigneeId") ?? "").trim();
  if (rawAssignee) {
    if (!(await getMembership(rawAssignee, old.workspaceId))) {
      return { error: t.errors.assigneeMustBeMember };
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

  // Journal : une entrée par champ réellement modifié, toutes reliées par un
  // même groupId (une seule ligne dans le flux d'événements).
  const groupId = crypto.randomUUID();
  if (old.title !== parsed.data.title) {
    await logActivity({ taskId: old.id, actorId: user.id, type: "TITLE_CHANGED", fromValue: old.title, toValue: parsed.data.title, groupId });
  }
  if ((old.description ?? null) !== description) {
    await logActivity({ taskId: old.id, actorId: user.id, type: "DESCRIPTION_CHANGED", groupId });
  }
  if (old.priority !== parsed.data.priority) {
    await logActivity({ taskId: old.id, actorId: user.id, type: "PRIORITY_CHANGED", fromValue: old.priority, toValue: parsed.data.priority, groupId });
  }
  const oldDue = old.dueDate ? old.dueDate.getTime() : null;
  const newDue = dueDate ? dueDate.getTime() : null;
  if (oldDue !== newDue) {
    await logActivity({ taskId: old.id, actorId: user.id, type: "DUE_DATE_CHANGED", fromValue: formatDate(old.dueDate), toValue: formatDate(dueDate), groupId });
  }
  if ((old.assigneeId ?? null) !== (assigneeId ?? null)) {
    // targetUserId = le nouvel assigné : l'événement lui est adressé (il le voit
    // dans son flux et peut être notifié en instantané). Une désassignation
    // (assigneeId null) reste un événement de tâche visible par les suiveurs.
    await logActivity({ taskId: old.id, actorId: user.id, type: "ASSIGNED", fromValue: old.assignee?.name ?? null, targetName: assigneeName, targetUserId: assigneeId ?? undefined, groupId });
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
  const t = await getDictionary();
  const parsed = statusSchema.safeParse({
    taskId: formData.get("taskId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: t.errors.invalidData };

  const task = await loadTaskForUser(user.id, parsed.data.taskId);
  if (!task) return { error: t.errors.taskNotFoundOrDenied };

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
        error:
          unfinished === 1
            ? t.errors.cannotCloseOne
            : t.errors.cannotCloseMany.replace("{n}", String(unfinished)),
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

// Réordonne les sous-tâches d'un parent : applique l'ordre reçu (ids) en
// position 0..n. N'affecte que les tâches réellement enfants de `parentId`.
export async function reorderTasks(parentId: string, orderedIds: string[]): Promise<void> {
  const user = await requireUser();
  const parent = await prisma.task.findUnique({
    where: { id: parentId },
    select: { workspaceId: true },
  });
  if (!parent) return;
  if (!(await getMembership(user.id, parent.workspaceId))) return;
  if (!(await canAccessTask(user.id, parentId))) return;

  const children = await prisma.task.findMany({
    where: { parentId },
    select: { id: true },
  });
  const childIds = new Set(children.map((c) => c.id));
  const valid = orderedIds.filter((id) => childIds.has(id));

  await prisma.$transaction(
    valid.map((id, i) => prisma.task.update({ where: { id }, data: { position: i } })),
  );

  revalidatePath(`/app/tasks/${parentId}`);
}

export async function deleteTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const t = await getDictionary();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return { error: t.errors.taskNotFound };

  const task = await loadTaskForUser(user.id, taskId);
  if (!task) return { error: t.errors.taskNotFoundOrDenied };

  // On ne peut pas supprimer une tâche qui a encore des sous-tâches.
  const childCount = await prisma.task.count({ where: { parentId: task.id } });
  if (childCount > 0) {
    return {
      error:
        childCount === 1
          ? t.errors.cannotDeleteOne
          : t.errors.cannotDeleteMany.replace("{n}", String(childCount)),
    };
  }

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
