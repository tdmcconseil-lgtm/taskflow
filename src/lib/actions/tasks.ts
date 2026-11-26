"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { canAccessTask, canAccessProject, getRootProject, canManageProject } from "@/lib/access";
import { getDictionary, zodError } from "@/lib/i18n/server";
import { ensureFollow } from "@/lib/follow";
import { logActivity } from "@/lib/activity";
import { formatDate } from "@/lib/labels";
import { computeAttachImpact } from "@/lib/attach-impact";

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

// Option « assigner = donner accès » : garantit que l'assigné d'une tâche peut
// accéder à son projet. Si le projet racine est restreint et que l'assigné n'y a
// pas encore accès (ni OWNER de l'espace, ni créateur, ni déjà membre du projet),
// on l'ajoute comme membre du projet (ProjectAccess MEMBER) et on le fait suivre
// le projet — même chemin que l'ajout manuel de membres (cf. addProjectMembers).
// Idempotent ; ne retire jamais d'accès (une désassignation ne révoque rien).
async function grantProjectAccessToAssignee(assigneeId: string, taskId: string): Promise<void> {
  const root = await getRootProject(taskId);
  if (!root) return;
  if (await canAccessProject(assigneeId, root)) return;
  await prisma.projectAccess.upsert({
    where: { taskId_userId: { taskId: root.id, userId: assigneeId } },
    update: {},
    create: { taskId: root.id, userId: assigneeId, role: "MEMBER" },
  });
  await ensureFollow(assigneeId, root.id);
}

const createSchema = z.object({
  workspaceId: z.string().optional(),
  parentId: z.string().optional(),
  title: z.string().trim().min(1, "titleRequired"),
  description: z.string().trim().max(5000).optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
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

  // Un projet (tâche racine) est toujours créé « restreint ». Son ouverture
  // éventuelle à tout l'espace se règle ensuite dans le module d'administration
  // des membres du projet.
  const isProject = parentId === null;

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
      ...(isProject ? { visibility: "RESTRICTED" } : {}),
    },
  });

  // Le créateur d'un projet en devient l'administrateur (entrée ProjectAccess),
  // ce qui matérialise son rôle et lui permet d'y gérer les membres.
  if (isProject) {
    await prisma.projectAccess.create({
      data: { taskId: task.id, userId: user.id, role: "ADMIN" },
    });
  }

  // Suivi automatique : le créateur et l'assigné suivent la tâche.
  await ensureFollow(user.id, task.id);
  if (assigneeId) {
    await ensureFollow(assigneeId, task.id);
    // Assigner à quelqu'un lui ouvre l'accès au projet s'il ne l'a pas encore.
    await grantProjectAccessToAssignee(assigneeId, task.id);
  }

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

  // Être assigné à une tâche la fait suivre et ouvre l'accès au projet.
  if (assigneeId) {
    await ensureFollow(assigneeId, old.id);
    await grantProjectAccessToAssignee(assigneeId, old.id);
  }

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

// Réordonne une fratrie selon l'ordre PERSONNEL de l'utilisateur : applique
// l'ordre reçu (ids) en position 0..n dans TaskOrder, pour lui seul (les autres
// utilisateurs ne sont pas affectés). `parentId` non null = sous-tâches d'une
// tâche ; `parentId` null = projets racine de l'espace (`workspaceId` requis).
// N'affecte que les tâches réellement membres de la fratrie. Pas d'audit (#1).
export async function reorderTasks(
  parentId: string | null,
  orderedIds: string[],
  workspaceId?: string,
): Promise<void> {
  const user = await requireUser();

  // Résout l'espace, le contrôle d'accès et le filtre de fratrie selon qu'on
  // réordonne des sous-tâches (accès au projet) ou des projets racine (membre).
  let wsId: string;
  let siblingWhere: { parentId: string } | { workspaceId: string; parentId: null };
  if (parentId === null) {
    if (!workspaceId) return;
    if (!(await getMembership(user.id, workspaceId))) return;
    wsId = workspaceId;
    siblingWhere = { workspaceId, parentId: null };
  } else {
    const parent = await prisma.task.findUnique({
      where: { id: parentId },
      select: { workspaceId: true },
    });
    if (!parent) return;
    if (!(await getMembership(user.id, parent.workspaceId))) return;
    if (!(await canAccessTask(user.id, parentId))) return;
    wsId = parent.workspaceId;
    siblingWhere = { parentId };
  }

  const siblings = await prisma.task.findMany({
    where: siblingWhere,
    select: { id: true },
  });
  const siblingIds = new Set(siblings.map((c) => c.id));
  const valid = orderedIds.filter((id) => siblingIds.has(id));

  // Ordre personnel : on enregistre la position voulue par CET utilisateur dans
  // TaskOrder (upsert), sans toucher le champ partagé Task.position.
  await prisma.$transaction(
    valid.map((id, i) =>
      prisma.taskOrder.upsert({
        where: { userId_taskId: { userId: user.id, taskId: id } },
        create: { userId: user.id, taskId: id, position: i },
        update: { position: i },
      }),
    ),
  );

  if (parentId === null) revalidatePath(`/app/workspaces/${wsId}`);
  else revalidatePath(`/app/tasks/${parentId}`);
  // Le menu latéral (layout) reflète aussi l'ordre personnel des projets.
  revalidatePath("/app", "layout");
}

// Résultat d'un déplacement dans la hiérarchie (#2 / #3) : succès ou message
// d'erreur (déjà traduit) à afficher dans la modale de confirmation.
export type ReparentResult = { ok: true } | { error: string };

// Déplace une tâche sous un nouveau parent (déplacements #2 « remonter d'un
// niveau » et #3 « rattacher sous une sœur »). La frontière projet/tâche est
// GELÉE : on refuse tout mouvement qui sortirait du projet racine ou franchirait
// la frontière (promotion d'une tâche en projet, rétrogradation d'un projet).
// La tâche emmène tout son sous-arbre. Écrit une entrée d'audit REPARENTED.
export async function reparentTask(
  taskId: string,
  newParentId: string,
): Promise<ReparentResult> {
  const user = await requireUser();
  const t = await getDictionary();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      workspaceId: true,
      parentId: true,
      parent: { select: { id: true, title: true } },
    },
  });
  if (!task) return { error: t.errors.taskNotFound };
  if (!(await getMembership(user.id, task.workspaceId))) return { error: t.errors.accessDenied };
  if (!(await canAccessTask(user.id, task.id))) return { error: t.errors.accessDenied };

  // Un projet (tâche racine) ne se déplace jamais : frontière gelée.
  if (task.parentId === null) return { error: t.errors.cannotMoveProject };
  // Mouvement sans effet (déjà sous ce parent).
  if (newParentId === task.parentId) return { error: t.errors.moveNoop };
  // On ne peut pas rattacher une tâche sous elle-même.
  if (newParentId === task.id) return { error: t.errors.moveInvalid };

  const newParent = await prisma.task.findUnique({
    where: { id: newParentId },
    select: { id: true, title: true, workspaceId: true },
  });
  if (!newParent) return { error: t.errors.parentNotFound };
  if (newParent.workspaceId !== task.workspaceId) return { error: t.errors.moveInvalid };

  // Frontière gelée : le projet racine ne doit pas changer. Comme le nouveau
  // parent est une tâche existante (jamais null), la tâche reste une sous-tâche.
  const [taskRoot, newParentRoot] = await Promise.all([
    getRootProject(task.id),
    getRootProject(newParent.id),
  ]);
  if (!taskRoot || !newParentRoot || taskRoot.id !== newParentRoot.id) {
    return { error: t.errors.moveCrossProject };
  }

  // Sûreté anti-cycle : le nouveau parent ne doit pas être un descendant de la
  // tâche déplacée (on remonte ses ancêtres jusqu'à la racine).
  let cursor: string | null = newParentId;
  let guard = 0;
  while (cursor && guard++ < 50) {
    if (cursor === task.id) return { error: t.errors.moveIntoDescendant };
    const row: { parentId: string | null } | null = await prisma.task.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = row?.parentId ?? null;
  }

  // Nouvelle position : en dernier enfant du nouveau parent.
  const position = await prisma.task.count({ where: { parentId: newParentId } });

  await prisma.task.update({
    where: { id: task.id },
    data: { parentId: newParentId, position },
  });

  // Journal : déplacement consigné sur la tâche (ancienne mère → nouvelle mère).
  await logActivity({
    taskId: task.id,
    actorId: user.id,
    type: "REPARENTED",
    fromValue: task.parent?.title ?? null,
    toValue: newParent.title,
  });

  revalidatePath("/app");
  revalidatePath(`/app/tasks/${task.id}`);
  revalidatePath(`/app/tasks/${newParentId}`);
  if (task.parentId) revalidatePath(`/app/tasks/${task.parentId}`);
  revalidatePath(`/app/workspaces/${task.workspaceId}`);
  return { ok: true };
}

// Résultat d'une transformation de tâche en projet : succès, ou message d'erreur
// (déjà traduit) à afficher dans la confirmation.
export type PromoteToProjectResult = { ok: true } | { error: string };

// Transforme une TÂCHE DE 1er NIVEAU en PROJET autonome (nouvelle racine).
// C'est le dégel ENCADRÉ du seul cas gelé par PR #1 (promotion tâche → projet) :
// la tâche (parentId → null) devient un projet restreint ; son sous-arbre
// d'actions la suit (nouvelle racine). Réservé à un ADMIN du projet source (ou
// l'OWNER de l'espace).
//
// Au lieu de BLOQUER quand un porteur n'a pas accès, on AMORCE le membership du
// nouveau projet (Thibaut l'autorise explicitement) : a minima l'opérateur
// (ADMIN) + tous les porteurs (assignees) du sous-arbre (MEMBER). L'auteur
// d'origine (`createdById`) est PRÉSERVÉ, pas seedé en plus : il garde l'accès
// par la règle « créateur ». Personne du sous-arbre ne perd donc l'accès. En revanche,
// les personnes qui n'y accédaient QUE via l'ancien projet sans être porteuses
// perdent la vue sur le sous-arbre promu (effet voulu d'un projet à part) :
// l'avertissement est présenté avant confirmation côté UI.
export async function promoteTaskToProject(taskId: string): Promise<PromoteToProjectResult> {
  const user = await requireUser();
  const t = await getDictionary();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      workspaceId: true,
      parentId: true,
      assigneeId: true,
      createdById: true,
    },
  });
  if (!task) return { error: t.errors.taskNotFound };
  if (!(await getMembership(user.id, task.workspaceId))) return { error: t.errors.accessDenied };

  // Déjà un projet (tâche racine) : rien à promouvoir.
  if (task.parentId === null) return { error: t.errors.alreadyProject };

  // Seule une tâche de 1er niveau (dont le parent EST un projet) peut être
  // promue : pas de saut multi-crans depuis une action profonde.
  const parentProject = await prisma.task.findUnique({
    where: { id: task.parentId },
    select: {
      id: true,
      title: true,
      parentId: true,
      workspaceId: true,
      createdById: true,
      visibility: true,
    },
  });
  if (!parentProject) return { error: t.errors.taskNotFound };
  if (parentProject.parentId !== null) return { error: t.errors.notFirstLevelTask };

  // Autorisation : seul un ADMIN du projet source (ou l'OWNER de l'espace) peut
  // en détacher une tâche de 1er niveau pour en faire un projet.
  if (!(await canManageProject(user.id, parentProject))) {
    return { error: t.errors.notProjectAdmin };
  }

  // Collecte des porteurs (assignees) de la tâche + de toute sa descendance.
  const assigneeIds = new Set<string>();
  if (task.assigneeId) assigneeIds.add(task.assigneeId);
  let frontier: string[] = [task.id];
  let depth = 0;
  while (frontier.length > 0 && depth++ < 100) {
    const rows = await prisma.task.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true, assigneeId: true },
    });
    frontier = rows.map((r) => r.id);
    for (const r of rows) if (r.assigneeId) assigneeIds.add(r.assigneeId);
  }

  // Amorçage du membership (a minima). L'opérateur est ADMIN ; les porteurs du
  // sous-arbre sont MEMBER. L'auteur d'origine de la tâche N'EST PAS ajouté s'il
  // n'est pas porteur : on PRÉSERVE `createdById` (décision de Thibaut), et il
  // garde l'accès par la règle « créateur » — rendu visible dans la page des
  // membres du projet (ligne « créateur »), sans entrée ProjectAccess.
  const memberIds = new Set<string>(assigneeIds);
  memberIds.delete(user.id); // l'opérateur est traité à part (ADMIN)

  // ATOMIQUE : le passage en projet RESTRICTED et l'amorçage des membres ne
  // doivent pas pouvoir se dissocier. Sinon un échec survenant APRÈS l'update
  // mais AVANT la fin du seed laisserait une tâche devenue projet restreint sans
  // ses membres amorcés → les porteurs du sous-arbre (voire l'opérateur)
  // perdraient l'accès, exactement ce que la feature doit empêcher. ensureFollow
  // et logActivity utilisent le client global et restent après le commit ; les
  // revalidatePath aussi (invalidations de cache, pas des écritures DB).
  await prisma.$transaction(async (tx) => {
    // La tâche devient un projet restreint, rangé en fin de liste des projets.
    // On PRÉSERVE `createdById` (auteur d'origine de la tâche).
    const position = await tx.task.count({
      where: { workspaceId: task.workspaceId, parentId: null },
    });
    await tx.task.update({
      where: { id: task.id },
      data: { parentId: null, visibility: "RESTRICTED", position },
    });
    // L'ordre d'affichage personnel appartenait à l'ancienne fratrie.
    await tx.taskOrder.deleteMany({ where: { taskId: task.id } });
    // Opérateur ADMIN.
    await tx.projectAccess.upsert({
      where: { taskId_userId: { taskId: task.id, userId: user.id } },
      update: { role: "ADMIN" },
      create: { taskId: task.id, userId: user.id, role: "ADMIN" },
    });
    // Porteurs du sous-arbre MEMBER.
    for (const uid of memberIds) {
      await tx.projectAccess.upsert({
        where: { taskId_userId: { taskId: task.id, userId: uid } },
        update: {},
        create: { taskId: task.id, userId: uid, role: "MEMBER" },
      });
    }
  });

  // L'opérateur et les porteurs suivent le nouveau projet (après le commit).
  await ensureFollow(user.id, task.id);
  for (const uid of assigneeIds) await ensureFollow(uid, task.id);

  await logActivity({
    taskId: task.id,
    actorId: user.id,
    type: "PROMOTED_TO_PROJECT",
    fromValue: parentProject.title,
    toValue: task.title,
  });

  revalidatePath("/app");
  revalidatePath("/app", "layout");
  revalidatePath(`/app/tasks/${task.id}`);
  revalidatePath(`/app/tasks/${parentProject.id}`);
  revalidatePath(`/app/workspaces/${task.workspaceId}`);
  return { ok: true };
}

// Résultat d'un rattachement de projet : succès, ou message d'erreur (déjà
// traduit) à afficher dans la confirmation.
export type AttachToProjectResult = { ok: true } | { error: string };

// Rattache un PROJET RACINE `projectId` (P) comme enfant de 1er niveau sous un
// autre PROJET RACINE `targetProjectId` (Q) du MÊME espace. C'est l'inverse exact
// de promoteTaskToProject : P (parentId null) est DÉMOTÉ en sous-tâche de Q.
//
// Après rattachement, la racine de P devient Q : la visibility et les
// ProjectAccess de P deviennent inertes, l'accès à P et à tout son contenu vient
// désormais de Q. Garde-fous (décisions validées) :
//  - Autorisation : l'opérateur doit être ADMIN de P ET de Q.
//  - BLOCAGE DUR : si un seul ayant-droit explicite de P (porteurs du sous-arbre
//    ∪ membres ProjectAccess ∪ créateur) n'a pas accès à Q, on N'ÉCRIT RIEN et on
//    renvoie une erreur. L'opérateur doit « nettoyer avant » (ajouter ces
//    personnes à Q, ou les retirer de P) puis réessayer. La page de confirmation
//    affiche la liste nominative et désactive le bouton ; ce contrôle serveur est
//    la défense de dernier ressort (l'action est atteignable par POST direct).
//  - L'exposition inverse (l'équipe de Q découvre P) est NON bloquante (alertée
//    côté UI uniquement).
export async function attachProjectToProject(
  projectId: string,
  targetProjectId: string,
): Promise<AttachToProjectResult> {
  const user = await requireUser();
  const t = await getDictionary();
  const a = t.attachToProject;

  // --- Projet source P : doit être une tâche racine (un projet). ---
  const source = await prisma.task.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      workspaceId: true,
      parentId: true,
      createdById: true,
      visibility: true,
    },
  });
  if (!source) return { error: t.errors.taskNotFound };
  if (!(await getMembership(user.id, source.workspaceId))) return { error: t.errors.accessDenied };
  if (source.parentId !== null) return { error: a.errNotAProject };

  // --- Projet d'accueil Q : doit lui aussi être une tâche racine. ---
  const target = await prisma.task.findUnique({
    where: { id: targetProjectId },
    select: {
      id: true,
      title: true,
      workspaceId: true,
      parentId: true,
      createdById: true,
      visibility: true,
    },
  });
  if (!target || target.parentId !== null) return { error: a.errTargetNotProject };

  // Anti-cycle : Q ne doit pas être P. P et Q étant deux racines distinctes,
  // aucune ne peut être descendante de l'autre ; le seul cas de cycle est Q = P.
  if (target.id === source.id) return { error: a.errCycle };

  // Même espace uniquement.
  if (target.workspaceId !== source.workspaceId) return { error: a.errCrossWorkspace };

  // Autorisation : ADMIN des DEUX projets (OWNER de l'espace y compris).
  const [canManageSource, canManageTarget] = await Promise.all([
    canManageProject(user.id, source),
    canManageProject(user.id, target),
  ]);
  if (!canManageSource || !canManageTarget) return { error: a.errNotProjectAdmin };

  // BLOCAGE DUR : recalcul serveur de l'impact ; si un ayant-droit explicite de P
  // n'a pas accès à Q, on refuse sans rien écrire.
  const impact = await computeAttachImpact(source, target);
  if (impact.blockers.length > 0) return { error: a.errBlocked };

  // ATOMIQUE : la démotion de P et le nettoyage de ses ProjectAccess (devenus
  // inertes) ne doivent pas pouvoir se dissocier. Un échec entre les deux
  // laisserait P rattaché sous Q tout en gardant des ProjectAccess fantômes.
  await prisma.$transaction(async (tx) => {
    // P devient enfant de 1er niveau de Q, en dernière position.
    const position = await tx.task.count({ where: { parentId: target.id } });
    await tx.task.update({
      where: { id: source.id },
      data: { parentId: target.id, position },
    });
    // Les ProjectAccess de P deviennent inertes (l'accès vient de Q) : on les
    // supprime pour éviter des entrées fantômes (D7).
    await tx.projectAccess.deleteMany({ where: { taskId: source.id } });
    // P n'est plus une racine : son ordre d'affichage personnel (fratrie des
    // projets de l'espace) n'a plus lieu d'être.
    await tx.taskOrder.deleteMany({ where: { taskId: source.id } });
  });

  // Après le commit : l'opérateur suit P, et on journalise le rattachement.
  await ensureFollow(user.id, source.id);
  await logActivity({
    taskId: source.id,
    actorId: user.id,
    type: "ATTACHED_TO_PROJECT",
    fromValue: source.title,
    toValue: target.title,
  });

  revalidatePath("/app");
  revalidatePath("/app", "layout");
  revalidatePath(`/app/tasks/${source.id}`);
  revalidatePath(`/app/tasks/${target.id}`);
  revalidatePath(`/app/workspaces/${source.workspaceId}`);
  return { ok: true };
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
