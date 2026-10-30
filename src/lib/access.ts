// Contrôle d'accès aux projets (tâches racine) et à leurs données.
//
// Règles :
//  - Un membre a TOUJOURS accès à un projet s'il en est le créateur, ou s'il est
//    administrateur (OWNER/ADMIN) de l'espace.
//  - Sinon : accès si le projet est visible par tout l'espace (WORKSPACE), ou
//    s'il figure dans la liste des membres autorisés (ProjectAccess).
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
  let current = await prisma.task.findUnique({
    where: { id: taskId },
    select: PROJECT_ACCESS_SELECT,
  });
  if (!current) return null;
  let guard = 0;
  while (current.parentId && guard++ < 20) {
    const parent = await prisma.task.findUnique({
      where: { id: current.parentId },
      select: PROJECT_ACCESS_SELECT,
    });
    if (!parent) break;
    current = parent;
  }
  const { id, workspaceId, createdById, visibility } = current;
  return { id, workspaceId, createdById, visibility };
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
  if (isAdminRole(membership.role)) return true;
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
