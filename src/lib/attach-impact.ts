// Impact d'accès d'un rattachement de projet « P sous Q » (démotion de la racine
// P en sous-tâche de Q). Partagé entre l'action serveur (garde-fou de blocage)
// et la page de confirmation (affichage nominatif), pour qu'elles calculent
// EXACTEMENT la même chose : aucune divergence entre « ce qui est montré » et
// « ce qui est vérifié avant d'écrire ».
//
// Rappel du modèle (src/lib/access.ts) : l'accès d'un nœud = l'accès de son
// PROJET RACINE. Après rattachement, la racine de P devient Q ; la visibility et
// les ProjectAccess de P deviennent inertes. Donc :
//  - Perte d'accès : un ayant-droit explicite de P sans accès à Q perd P.
//  - Exposition : toute l'équipe de Q gagne l'accès à tout le contenu de P.
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/access";
import { ASSIGNEE_SELECT } from "@/lib/task-tree";

// Champs d'accès d'un projet (tâche racine), cf. ProjectAccessFields d'access.ts.
export type ProjectAccessFields = {
  id: string;
  workspaceId: string;
  createdById: string;
  visibility: "WORKSPACE" | "RESTRICTED";
};

// Utilisateur hydraté pour l'affichage (avatar + nom + email).
export type ImpactUser = {
  id: string;
  name: string;
  email: string;
  photoX: number;
  photoY: number;
  photoZoom: number;
  photoUpdatedAt: Date | null;
};

export type AttachImpact = {
  // Ayants-droit explicites de P qui perdraient l'accès (BLOCAGE DUR).
  blockers: ImpactUser[];
  // Membres de l'équipe de Q qui vont découvrir le contenu de P (non bloquant).
  exposed: ImpactUser[];
  // P était-il ouvert à tout l'espace (notice renforcée) ?
  sourceWasWorkspace: boolean;
};

// Porteurs (assignees) de la tâche racine + de TOUT son sous-arbre (BFS, garde de
// profondeur <100 — même motif que promoteTaskToProject).
export async function collectSubtreeAssignees(rootTaskId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const self = await prisma.task.findUnique({
    where: { id: rootTaskId },
    select: { assigneeId: true },
  });
  if (self?.assigneeId) ids.add(self.assigneeId);

  let frontier: string[] = [rootTaskId];
  let depth = 0;
  while (frontier.length > 0 && depth++ < 100) {
    const rows = await prisma.task.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true, assigneeId: true },
    });
    frontier = rows.map((r) => r.id);
    for (const r of rows) if (r.assigneeId) ids.add(r.assigneeId);
  }
  return ids;
}

// Ayants-droit EXPLICITES de P = porteurs du sous-arbre ∪ membres ProjectAccess
// de P ∪ créateur de P. (On ne compte PAS « tout l'espace » même si P est
// WORKSPACE : sinon P ne serait jamais rattachable — cf. cas bord de la
// conception.)
export async function collectExplicitRightholders(
  project: { id: string; createdById: string },
): Promise<Set<string>> {
  const ids = await collectSubtreeAssignees(project.id);
  ids.add(project.createdById);
  const access = await prisma.projectAccess.findMany({
    where: { taskId: project.id },
    select: { userId: true },
  });
  for (const a of access) ids.add(a.userId);
  return ids;
}

async function hydrate(ids: string[]): Promise<ImpactUser[]> {
  if (ids.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { ...ASSIGNEE_SELECT, email: true },
  });
  return users.sort((a, b) => a.name.localeCompare(b.name));
}

// Calcule l'impact d'accès du rattachement de `source` (P) sous `target` (Q).
// `source` et `target` sont des projets RACINE (ProjectAccessFields). Les deux
// doivent appartenir au même espace (vérifié par l'appelant).
export async function computeAttachImpact(
  source: ProjectAccessFields,
  target: ProjectAccessFields,
): Promise<AttachImpact> {
  // Bloqueurs : ayants-droit explicites de P qui n'ont PAS accès à Q.
  const rightholderIds = await collectExplicitRightholders(source);
  const blockerIds: string[] = [];
  for (const uid of rightholderIds) {
    if (!(await canAccessProject(uid, target))) blockerIds.push(uid);
  }

  // Exposition : membres de l'espace qui ont accès à Q mais PAS encore à P.
  // (Avant rattachement, P est sa propre racine : canAccessProject(_, P) est
  // l'accès réel actuel à P.)
  const members = await prisma.membership.findMany({
    where: { workspaceId: source.workspaceId, deactivatedAt: null },
    select: { userId: true },
  });
  const exposedIds: string[] = [];
  for (const m of members) {
    if (!(await canAccessProject(m.userId, target))) continue;
    if (!(await canAccessProject(m.userId, source))) exposedIds.push(m.userId);
  }

  const [blockers, exposed] = await Promise.all([
    hydrate(blockerIds),
    hydrate(exposedIds),
  ]);

  return {
    blockers,
    exposed,
    sourceWasWorkspace: source.visibility === "WORKSPACE",
  };
}
