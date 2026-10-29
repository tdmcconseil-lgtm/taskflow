"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";

export type FormState = { error?: string } | undefined;

const STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1, "Le titre est requis."),
  description: z.string().trim().max(5000).optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  dueDate: z.string().optional(),
});

// Charge un projet et vérifie que l'utilisateur est membre de son workspace.
async function loadProjectForUser(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  });
  if (!project) return null;
  const membership = await getMembership(userId, project.workspaceId);
  if (!membership) return null;
  return project;
}

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    assigneeId: formData.get("assigneeId") || undefined,
    priority: formData.get("priority") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const project = await loadProjectForUser(user.id, parsed.data.projectId);
  if (!project) {
    return { error: "Projet introuvable ou accès refusé." };
  }

  // L'assigné doit être membre du même workspace.
  let assigneeId: string | null = null;
  if (parsed.data.assigneeId) {
    const assigneeMembership = await getMembership(parsed.data.assigneeId, project.workspaceId);
    if (!assigneeMembership) {
      return { error: "La personne assignée doit être membre de l'espace de travail." };
    }
    assigneeId = parsed.data.assigneeId;
  }

  let dueDate: Date | null = null;
  if (parsed.data.dueDate) {
    const d = new Date(parsed.data.dueDate);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }

  await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      projectId: project.id,
      createdById: user.id,
      assigneeId,
      dueDate,
    },
  });

  revalidatePath(`/app/projects/${project.id}`);
  redirect(`/app/projects/${project.id}`);
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

  const task = await prisma.task.findUnique({
    where: { id: parsed.data.taskId },
    select: { id: true, project: { select: { id: true, workspaceId: true } } },
  });
  if (!task) return { error: "Tâche introuvable." };

  const membership = await getMembership(user.id, task.project.workspaceId);
  if (!membership) return { error: "Accès refusé." };

  // Champs facultatifs : une valeur vide efface le champ.
  const description = String(formData.get("description") ?? "").trim() || null;

  let assigneeId: string | null = null;
  const rawAssignee = String(formData.get("assigneeId") ?? "").trim();
  if (rawAssignee) {
    const assigneeMembership = await getMembership(rawAssignee, task.project.workspaceId);
    if (!assigneeMembership) {
      return { error: "La personne assignée doit être membre de l'espace de travail." };
    }
    assigneeId = rawAssignee;
  }

  let dueDate: Date | null = null;
  const rawDue = String(formData.get("dueDate") ?? "").trim();
  if (rawDue) {
    const d = new Date(rawDue);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { title: parsed.data.title, description, priority: parsed.data.priority, assigneeId, dueDate },
  });

  revalidatePath(`/app/projects/${task.project.id}`);
  redirect(`/app/projects/${task.project.id}`);
}

const statusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(STATUSES),
});

export async function setTaskStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = statusSchema.safeParse({
    taskId: formData.get("taskId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const task = await prisma.task.findUnique({
    where: { id: parsed.data.taskId },
    select: { id: true, project: { select: { id: true, workspaceId: true } } },
  });
  if (!task) return;
  const membership = await getMembership(user.id, task.project.workspaceId);
  if (!membership) return;

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: parsed.data.status,
      completedAt: parsed.data.status === "DONE" ? new Date() : null,
    },
  });

  revalidatePath(`/app/projects/${task.project.id}`);
  revalidatePath("/app");
}

export async function deleteTask(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, project: { select: { id: true, workspaceId: true } } },
  });
  if (!task) return;
  const membership = await getMembership(user.id, task.project.workspaceId);
  if (!membership) return;

  await prisma.task.delete({ where: { id: task.id } });
  revalidatePath(`/app/projects/${task.project.id}`);
}
