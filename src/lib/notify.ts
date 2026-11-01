// Service de notifications email — couche agnostique du canal, branchée sur le
// moteur d'événements existant (TaskActivity + TaskFollow). On ne recalcule
// jamais « qui est concerné » : les destinataires se déduisent de la même règle
// que le flux in-app (événement adressé → destinataire ciblé ; sinon → suiveurs).
//
// Ici, on ENVOIE rien : on résout les destinataires et on empile des lignes dans
// NotificationOutbox pour les événements instantanés. L'envoi est fait par le
// drainer / le digest (src/lib/notify-dispatch.ts), portés par le scheduler.

import { prisma } from "@/lib/prisma";
import type {
  NotifChannel,
  DigestFrequency,
  TaskActivityType,
} from "@/generated/prisma/client";

// Les cinq catégories métier exposées à l'utilisateur (pas les 11 types techniques).
export type NotifCategory =
  | "mentions"
  | "assignments"
  | "discussions"
  | "taskChanges"
  | "dueReminders";

// Préférences effectives d'un utilisateur (valeurs par défaut si aucune ligne).
export type EffectivePreference = {
  emailEnabled: boolean;
  mentions: NotifChannel;
  assignments: NotifChannel;
  discussions: NotifChannel;
  taskChanges: NotifChannel;
  dueReminders: NotifChannel;
  digestFrequency: DigestFrequency;
};

// Défauts volontairement sobres : seuls les événements adressés partent en
// instantané ; tout le reste attend le digest quotidien.
export const DEFAULT_PREFERENCE: EffectivePreference = {
  emailEnabled: true,
  mentions: "INSTANT",
  assignments: "INSTANT",
  discussions: "DIGEST",
  taskChanges: "DIGEST",
  dueReminders: "INSTANT",
  digestFrequency: "DAILY",
};

// Type technique → catégorie métier. FOLLOWER_ADDED (« on vous a mis sur une
// tâche ») est rattaché aux assignations : même nature actionnable, un seul
// réglage pour l'utilisateur.
export function categoryOfType(type: TaskActivityType): NotifCategory {
  switch (type) {
    case "MENTIONED":
      return "mentions";
    case "ASSIGNED":
    case "FOLLOWER_ADDED":
      return "assignments";
    case "COMMENT_ADDED":
      return "discussions";
    default:
      return "taskChanges";
  }
}

// Libellé « kind » stocké sur la ligne d'outbox (traçabilité / debug).
function instantKind(type: TaskActivityType): string {
  switch (type) {
    case "MENTIONED":
      return "INSTANT_MENTION";
    case "ASSIGNED":
      return "INSTANT_ASSIGN";
    case "FOLLOWER_ADDED":
      return "INSTANT_FOLLOWER";
    case "COMMENT_ADDED":
      return "INSTANT_DISCUSSION";
    default:
      return "INSTANT_TASK";
  }
}

// Préférences effectives d'un utilisateur : la ligne si elle existe, sinon les
// défauts. Utilisé par l'UI et par la résolution de destinataires.
export async function getEffectivePreference(userId: string): Promise<EffectivePreference> {
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!pref) return { ...DEFAULT_PREFERENCE };
  return {
    emailEnabled: pref.emailEnabled,
    mentions: pref.mentions,
    assignments: pref.assignments,
    discussions: pref.discussions,
    taskChanges: pref.taskChanges,
    dueReminders: pref.dueReminders,
    digestFrequency: pref.digestFrequency,
  };
}

// Destinataires d'une activité : le ciblé pour un événement adressé, sinon tous
// les suiveurs actifs de la tâche. L'acteur est toujours exclu (jamais notifié
// de sa propre action).
async function recipientsOf(activity: {
  taskId: string;
  actorId: string;
  targetUserId: string | null;
}): Promise<string[]> {
  if (activity.targetUserId) {
    return activity.targetUserId === activity.actorId ? [] : [activity.targetUserId];
  }
  const follows = await prisma.taskFollow.findMany({
    where: { taskId: activity.taskId, following: true, userId: { not: activity.actorId } },
    select: { userId: true },
  });
  return follows.map((f) => f.userId);
}

// Point d'entrée appelé après l'écriture d'une activité (logActivity). Empile
// une ligne d'outbox pour chaque destinataire dont la catégorie est réglée sur
// INSTANT (et dont l'email est activé). Les régimes DIGEST / OFF ne produisent
// rien ici — le digest les récupère via le « read-cut ». Ne lève jamais : une
// notification ne doit pas casser l'action utilisateur.
export async function notifyActivity(activityId: string): Promise<void> {
  try {
    const activity = await prisma.taskActivity.findUnique({
      where: { id: activityId },
      select: { id: true, type: true, taskId: true, actorId: true, targetUserId: true },
    });
    if (!activity) return;

    const recipients = await recipientsOf(activity);
    if (recipients.length === 0) return;

    const category = categoryOfType(activity.type);
    const kind = instantKind(activity.type);

    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: { in: recipients } },
    });
    const prefByUser = new Map(prefs.map((p) => [p.userId, p]));

    const toEnqueue: { userId: string; activityId: string; kind: string }[] = [];
    for (const userId of recipients) {
      const pref = prefByUser.get(userId);
      const emailEnabled = pref?.emailEnabled ?? DEFAULT_PREFERENCE.emailEnabled;
      const channel: NotifChannel = pref ? pref[category] : DEFAULT_PREFERENCE[category];
      if (emailEnabled && channel === "INSTANT") {
        toEnqueue.push({ userId, activityId: activity.id, kind });
      }
    }

    if (toEnqueue.length > 0) {
      // @@unique(userId, activityId) : un même fait n'est jamais empilé deux fois.
      await prisma.notificationOutbox.createMany({ data: toEnqueue, skipDuplicates: true });
    }
  } catch (err) {
    console.error("[notify] notifyActivity a échoué", err);
  }
}
