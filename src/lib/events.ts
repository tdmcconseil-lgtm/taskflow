import { prisma } from "@/lib/prisma";
import { ASSIGNEE_SELECT, toAssigneeInfo, type AssigneeInfo, type RawTask } from "@/lib/task-tree";
import { describeActivity, aspectLabel, joinWithAnd } from "@/lib/activity-text";
import type { TaskActivityType } from "@/generated/prisma/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

type ActorInfo = NonNullable<RawTask["assignee"]>;

type EventRow = {
  id: string;
  type: TaskActivityType;
  fromValue: string | null;
  toValue: string | null;
  targetName: string | null;
  groupId: string | null;
  createdAt: Date;
  actor: ActorInfo;
  task: { id: string; title: string; workspace: { name: string } };
};

export type EventGroup = {
  key: string;
  actor: AssigneeInfo;
  actorName: string;
  task: { id: string; title: string; workspace: string };
  createdAt: Date;
  summary: string;
  unread: boolean;
};

const EVENT_SELECT = {
  id: true,
  type: true,
  fromValue: true,
  toValue: true,
  targetName: true,
  groupId: true,
  createdAt: true,
  actor: { select: ASSIGNEE_SELECT },
  task: { select: { id: true, title: true, workspace: { select: { name: true } } } },
} as const;

// Identifiants des tâches actuellement suivies (★) par l'utilisateur.
async function followedTaskIds(userId: string): Promise<string[]> {
  const rows = await prisma.taskFollow.findMany({
    where: { userId, following: true },
    select: { taskId: true },
  });
  return rows.map((r) => r.taskId);
}

// Un événement est visible s'il porte sur une tâche suivie (événement de tâche)
// ou s'il m'est adressé (mention). `includeOwn` : inclure ou non mes propres
// actions (masquées par défaut).
function whereForUser(
  userId: string,
  followed: string[],
  includeOwn: boolean,
  workspaceId?: string,
) {
  const base = {
    ...(workspaceId ? { task: { workspaceId } } : {}),
    OR: [
      { taskId: { in: followed }, targetUserId: null },
      { targetUserId: userId },
    ],
  };
  return includeOwn ? base : { actorId: { not: userId }, ...base };
}

// Résumé d'un groupe d'événements (sans le nom de l'auteur), traduit.
function summarize(events: EventRow[], t: Dictionary): string {
  if (events.some((e) => e.type === "MENTIONED")) {
    return t.activity.mentionedYou;
  }
  if (events.length === 1) {
    return describeActivity(events[0], t);
  }
  // Plusieurs changements d'une même sauvegarde → une seule ligne.
  const aspects = events.map((e) => aspectLabel(e.type, t)).filter((x): x is string => !!x);
  if (aspects.length === 0) return t.activity.updatedTask;
  return `${t.activity.updatedTaskWith} ${joinWithAnd(aspects, t.activity.and)}`;
}

// Regroupe les événements partageant un groupId (sauvegarde multi-champs,
// commentaire + mentions) ; ceux sans groupId restent individuels.
function groupEvents(rows: EventRow[], readAt: Date | null, t: Dictionary): EventGroup[] {
  const map = new Map<string, EventRow[]>();
  const order: string[] = [];
  for (const r of rows) {
    const key = r.groupId ?? r.id;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(r);
  }
  return order.map((key) => {
    const evs = map.get(key)!;
    const createdAt = evs.reduce((max, e) => (e.createdAt > max ? e.createdAt : max), evs[0].createdAt);
    const head = evs[0];
    return {
      key,
      actor: toAssigneeInfo(head.actor)!,
      actorName: head.actor.name,
      task: { id: head.task.id, title: head.task.title, workspace: head.task.workspace.name },
      createdAt,
      summary: summarize(evs, t),
      unread: !readAt || createdAt > readAt,
    };
  });
}

// Flux d'événements de l'utilisateur, groupé, du plus récent au plus ancien.
export async function getEventFeed(
  userId: string,
  readAt: Date | null,
  t: Dictionary,
  includeOwn = false,
  limit = 100,
  workspaceId?: string,
): Promise<EventGroup[]> {
  const followed = await followedTaskIds(userId);
  const rows = await prisma.taskActivity.findMany({
    where: whereForUser(userId, followed, includeOwn, workspaceId),
    orderBy: { createdAt: "desc" },
    take: limit,
    select: EVENT_SELECT,
  });
  return groupEvents(rows as EventRow[], readAt, t);
}

// Nombre de lignes d'événements nouvelles depuis la dernière consultation.
// Le badge ne compte que ce que les autres ont fait (actions propres exclues).
export async function countNewEventGroups(userId: string, readAt: Date | null): Promise<number> {
  const followed = await followedTaskIds(userId);
  const rows = await prisma.taskActivity.findMany({
    where: {
      ...whereForUser(userId, followed, false),
      ...(readAt ? { createdAt: { gt: readAt } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, groupId: true },
  });
  const keys = new Set(rows.map((r) => r.groupId ?? r.id));
  return keys.size;
}
