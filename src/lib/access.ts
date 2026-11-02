// Contrôle d'accès aux projets (tâches racine) et à leurs données.
//
// Règles (confidentialité stricte) :
//  - L'OWNER de l'espace garde un accès de plein droit à tous les projets
//    (secours anti-blocage : il peut toujours se rajouter comme admin de projet).
//  - Tout autre membre, y compris un ADMIN d'espace, accède à un projet
//    seulement s'il en est le créateur, s'il figure dans ProjectAccess, ou si le
//    projet est ouvert à tout l'espace (visibility WORKSPACE).
//  - Les sous-tâches et données héritent de l'accès de leur projet racine.
//  - Un membre désactivé (ou non-membre) n'a aucun accès.
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type Role = "OWNER" | "ADMIN" | "MEMBER";

export function isAdminRole(role: Role | null | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}

type ProjectAccessFields = {
  id: string;
  workspaceId: string;
  createdById: string;
  visibility: "WORKSPACE" | "RESTRICTED";
};

const PROJECT_ACCESS_SELECT = {
  id: true,
  parentId: true,
  workspaceId: true,
  createdById: true,
  visibility: true,
} as const;

type ProjectRow = {
  id: string;
  parentId: string | null;
  workspaceId: string;
  createdById: string;
  visibility: "WORKSPACE" | "RESTRICTED";
};

// Filtre Prisma des projets (tâches racine) visibles par un membre NON-admin.
// Pour un admin, renvoyer {} (tout visible). À combiner avec { parentId: null }.
export function nonAdminProjectVisibility(userId: string): Prisma.TaskWhereInput {
  return {
    OR: [
      { visibility: "WORKSPACE" },
      { createdById: userId },
      { access: { some: { userId } } },
    ],
  };
}

// Projet racine d'une tâche (remonte la hiérarchie des parents).
export async function getRootProject(taskId: string): Promise<ProjectAccessFields | null> {
  const first: ProjectRow | null = await prisma.task.findUnique({
    where: { id: taskId },
    select: PROJECT_ACCESS_SELECT,
  });
  if (!first) return null;

  let current: ProjectRow = first;
  let guard = 0;
  while (current.parentId && guard++ < 20) {
    const parent: ProjectRow | null = await prisma.task.findUnique({
      where: { id: current.parentId },
      select: PROJECT_ACCESS_SELECT,
    });
    if (!parent) break;
    current = parent;
  }

  return {
    id: current.id,
    workspaceId: current.workspaceId,
    createdById: current.createdById,
    visibility: current.visibility,
  };
}

// Un membre peut-il accéder à ce projet (tâche racine) ?
export async function canAccessProject(
  userId: string,
  project: ProjectAccessFields,
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: { userId, workspaceId: project.workspaceId, deactivatedAt: null },
    select: { role: true },
  });
  if (!membership) return false;
  // Seul l'OWNER conserve un accès de plein droit (les ADMIN d'espace non).
  if (membership.role === "OWNER") return true;
  if (project.createdById === userId) return true;
  if (project.visibility === "WORKSPACE") return true;
  const entry = await prisma.projectAccess.findUnique({
    where: { taskId_userId: { taskId: project.id, userId } },
    select: { id: true },
  });
  return !!entry;
}

// Un membre peut-il accéder à cette tâche (ou sous-tâche) ? Contrôle le projet racine.
export async function canAccessTask(userId: string, taskId: string): Promise<boolean> {
  const root = await getRootProject(taskId);
  if (!root) return false;
  return canAccessProject(userId, root);
}

// Peut-il GÉRER les membres d'un projet ? L'OWNER de l'espace (secours), ou un
// membre du projet ayant le rôle ADMIN (le créateur en fait partie).
export async function canManageProject(
  userId: string,
  project: ProjectAccessFields,
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: { userId, workspaceId: project.workspaceId, deactivatedAt: null },
    select: { role: true },
  });
  if (!membership) return false;
  if (membership.role === "OWNER") return true;
  const entry = await prisma.projectAccess.findUnique({
    where: { taskId_userId: { taskId: project.id, userId } },
    select: { role: true },
  });
  return entry?.role === "ADMIN";
}
