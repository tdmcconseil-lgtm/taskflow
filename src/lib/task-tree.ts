import type { TaskStatus, TaskPriority } from "@/generated/prisma/client";

// Infos de l'assigné nécessaires pour afficher sa miniature (photo cadrée).
export type AssigneeInfo = {
  id: string;
  name: string;
  photoX: number;
  photoY: number;
  photoZoom: number;
  version: number;
};

export type TaskNode = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: AssigneeInfo | null;
  dueDate: Date | null;
  attachmentCount: number;
  parentId: string | null;
  children: TaskNode[];
};

export type RawTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  parentId: string | null;
  attachmentCount?: number;
  assignee: {
    id: string;
    name: string;
    photoX: number;
    photoY: number;
    photoZoom: number;
    photoUpdatedAt: Date | null;
  } | null;
};

export function toAssigneeInfo(a: RawTask["assignee"]): AssigneeInfo | null {
  if (!a) return null;
  return {
    id: a.id,
    name: a.name,
    photoX: a.photoX,
    photoY: a.photoY,
    photoZoom: a.photoZoom,
    version: a.photoUpdatedAt?.getTime() ?? 0,
  };
}

// Sélecteur Prisma réutilisable pour charger l'assigné d'une tâche.
export const ASSIGNEE_SELECT = {
  id: true,
  name: true,
  photoX: true,
  photoY: true,
  photoZoom: true,
  photoUpdatedAt: true,
} as const;

// Construit l'arbre des tâches à partir d'une liste plate (celles d'un espace).
export function buildTaskIndex(tasks: RawTask[]): {
  roots: TaskNode[];
  byId: Map<string, TaskNode>;
} {
  const byId = new Map<string, TaskNode>();
  for (const t of tasks) {
    byId.set(t.id, {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assignee: toAssigneeInfo(t.assignee),
      dueDate: t.dueDate,
      attachmentCount: t.attachmentCount ?? 0,
      parentId: t.parentId,
      children: [],
    });
  }
  const roots: TaskNode[] = [];
  for (const t of tasks) {
    const node = byId.get(t.id)!;
    const parent = t.parentId ? byId.get(t.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return { roots, byId };
}
