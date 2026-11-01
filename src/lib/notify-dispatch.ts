// Envoi effectif des notifications email. Deux chemins convergent vers sendMail,
// appelés par le scheduler interne (src/lib/scheduler.ts) :
//   - drainInstant() : vide l'outbox des événements instantanés (~30 s) ;
//   - runDigests()   : pour chaque utilisateur « dû », un récapitulatif groupé.
// Rien ici n'est appelé pendant une requête utilisateur : l'outbox découple
// l'action de l'envoi SMTP.

import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";
import { describeActivity } from "@/lib/activity-text";
import { categoryOfType, DEFAULT_PREFERENCE } from "@/lib/notify";
import {
  sendMail,
  notifyMentionEmail,
  notifyAssignedEmail,
  notifyFollowerAddedEmail,
  notifyUpdateEmail,
  digestEmail,
  type NotificationMail,
} from "@/lib/mail";
import type { TaskActivityType } from "@/generated/prisma/client";

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3001";
}
function taskUrl(taskId: string): string {
  return `${appUrl()}/app/tasks/${taskId}`;
}
function manageUrl(): string {
  return `${appUrl()}/app/profile#notifications`;
}
function normalizeLocale(value: string | null): Locale {
  return (locales as readonly string[]).includes(value ?? "") ? (value as Locale) : defaultLocale;
}

// Rang de priorité quand plusieurs événements partagent un groupId : on choisit
// le plus « fort » pour le gabarit instantané du mail groupé.
const TYPE_RANK: Partial<Record<TaskActivityType, number>> = {
  MENTIONED: 0,
  ASSIGNED: 1,
  FOLLOWER_ADDED: 2,
};
function rankOf(type: TaskActivityType): number {
  return TYPE_RANK[type] ?? 3;
}

type ActivityRow = {
  id: string;
  type: TaskActivityType;
  fromValue: string | null;
  toValue: string | null;
  targetName: string | null;
  groupId: string | null;
  taskId: string;
  task: { title: string; workspace: { name: string } };
  actor: { name: string };
};

const ACTIVITY_SELECT = {
  id: true,
  type: true,
  fromValue: true,
  toValue: true,
  targetName: true,
  groupId: true,
  taskId: true,
  task: { select: { title: true, workspace: { select: { name: true } } } },
  actor: { select: { name: true } },
} as const;

// --- Chemin instantané -----------------------------------------------------

export async function drainInstant(limit = 300): Promise<number> {
  const rows = await prisma.notificationOutbox.findMany({
    where: { sentAt: null, activityId: { not: null } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, userId: true, activityId: true },
  });
  if (rows.length === 0) return 0;

  const activityIds = [...new Set(rows.map((r) => r.activityId!).filter(Boolean))];
  const userIds = [...new Set(rows.map((r) => r.userId))];

  const [activities, users, prefs] = await Promise.all([
    prisma.taskActivity.findMany({ where: { id: { in: activityIds } }, select: ACTIVITY_SELECT }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, locale: true },
    }),
    prisma.notificationPreference.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, emailEnabled: true },
    }),
  ]);
  const activityById = new Map(activities.map((a) => [a.id, a as ActivityRow]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const emailOff = new Set(prefs.filter((p) => !p.emailEnabled).map((p) => p.userId));

  // Regroupe par (destinataire, groupId ?? activityId) : une sauvegarde
  // multi-champs = un seul mail.
  const groups = new Map<string, { rowIds: string[]; userId: string; acts: ActivityRow[] }>();
  for (const r of rows) {
    const act = activityById.get(r.activityId!);
    if (!act) continue;
    const key = `${r.userId}::${act.groupId ?? act.id}`;
    const g = groups.get(key) ?? { rowIds: [], userId: r.userId, acts: [] };
    g.rowIds.push(r.id);
    g.acts.push(act);
    groups.set(key, g);
  }

  let sent = 0;
  for (const g of groups.values()) {
    const user = userById.get(g.userId);
    // Destinataire introuvable, ou email coupé depuis l'empilage → on consomme la
    // ligne sans envoyer (évite de la retraiter indéfiniment).
    if (!user || emailOff.has(g.userId)) {
      await markSent(g.rowIds);
      continue;
    }
    const rep = g.acts.slice().sort((a, b) => rankOf(a.type) - rankOf(b.type))[0];
    const locale = normalizeLocale(user.locale);
    const t = await getDictionary(locale);
    const base = {
      name: user.name,
      actor: rep.actor.name,
      task: rep.task.title,
      workspace: rep.task.workspace.name,
      url: taskUrl(rep.taskId),
      manageUrl: manageUrl(),
    };

    let mail: NotificationMail;
    switch (rep.type) {
      case "MENTIONED":
        mail = notifyMentionEmail(base, t);
        break;
      case "ASSIGNED":
        mail = notifyAssignedEmail(base, t);
        break;
      case "FOLLOWER_ADDED":
        mail = notifyFollowerAddedEmail(base, t);
        break;
      default:
        mail = notifyUpdateEmail({ ...base, detail: describeActivity(rep, t) }, t);
    }

    try {
      await sendMail({ to: user.email, subject: mail.subject, body: mail.body, headers: mail.headers });
      await markSent(g.rowIds);
      sent++;
    } catch (err) {
      console.error("[notify] envoi instantané échoué", err);
      // On laisse les lignes en attente pour un prochain passage.
    }
  }
  return sent;
}

async function markSent(rowIds: string[]): Promise<void> {
  await prisma.notificationOutbox.updateMany({
    where: { id: { in: rowIds } },
    data: { sentAt: new Date() },
  });
}

// --- Chemin digest ---------------------------------------------------------

const HOURLY_DUE_MS = Number.parseInt(process.env.DIGEST_HOURLY_MS ?? String(55 * 60 * 1000), 10);
const DAILY_DUE_MS = Number.parseInt(process.env.DIGEST_DAILY_MS ?? String(23 * 60 * 60 * 1000), 10);

export async function runDigests(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { follows: { some: {} } },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      eventsReadAt: true,
      lastDigestAt: true,
      notificationPreference: true,
    },
  });

  const now = new Date();
  let sent = 0;
  for (const user of users) {
    try {
      const pref = user.notificationPreference;
      const emailEnabled = pref?.emailEnabled ?? DEFAULT_PREFERENCE.emailEnabled;
      if (!emailEnabled) continue;

      // Premier passage : on cale le curseur sans déverser l'historique.
      if (!user.lastDigestAt) {
        await prisma.user.update({ where: { id: user.id }, data: { lastDigestAt: now } });
        continue;
      }
      const freq = pref?.digestFrequency ?? DEFAULT_PREFERENCE.digestFrequency;
      const dueMs = freq === "HOURLY" ? HOURLY_DUE_MS : DAILY_DUE_MS;
      if (now.getTime() - user.lastDigestAt.getTime() < dueMs) continue;

      const didSend = await buildAndSendDigest(user, now);
      if (didSend) sent++;
      // Dans tous les cas, on avance le curseur : les éléments non retenus étaient
      // déjà lus ou déjà mailés.
      await prisma.user.update({ where: { id: user.id }, data: { lastDigestAt: now } });
    } catch (err) {
      console.error("[notify] digest échoué pour l'utilisateur", user.id, err);
    }
  }
  return sent;
}

async function buildAndSendDigest(
  user: {
    id: string;
    name: string;
    email: string;
    locale: string | null;
    eventsReadAt: Date | null;
    lastDigestAt: Date | null;
  },
  now: Date,
): Promise<boolean> {
  const follows = await prisma.taskFollow.findMany({
    where: { userId: user.id },
    select: { taskId: true, following: true, lastReadAt: true },
  });
  const followedIds = follows.filter((f) => f.following).map((f) => f.taskId);
  const lastReadByTask = new Map(follows.map((f) => [f.taskId, f.lastReadAt]));

  const candidates = (await prisma.taskActivity.findMany({
    where: {
      createdAt: { gt: user.lastDigestAt!, lte: now },
      actorId: { not: user.id },
      OR: [
        { taskId: { in: followedIds }, targetUserId: null },
        { targetUserId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { ...ACTIVITY_SELECT, createdAt: true, targetUserId: true },
  })) as (ActivityRow & { createdAt: Date; targetUserId: string | null })[];

  if (candidates.length === 0) return false;

  const pref = await prisma.notificationPreference.findUnique({ where: { userId: user.id } });
  const channelOf = (type: TaskActivityType) => {
    const cat = categoryOfType(type);
    return pref ? pref[cat] : DEFAULT_PREFERENCE[cat];
  };

  // read-cut : exclut ce qui a déjà été vu dans l'app (page Événements ou lecture
  // de la discussion de la tâche).
  const isRead = (c: { taskId: string; createdAt: Date }) => {
    if (user.eventsReadAt && user.eventsReadAt >= c.createdAt) return true;
    const r = lastReadByTask.get(c.taskId);
    return !!r && r >= c.createdAt;
  };

  const kept = candidates.filter((c) => channelOf(c.type) === "DIGEST" && !isRead(c));
  if (kept.length === 0) return false;

  // Exclut ce qui a déjà été mailé (instantané ou digest précédent).
  const already = await prisma.notificationOutbox.findMany({
    where: { userId: user.id, activityId: { in: kept.map((c) => c.id) } },
    select: { activityId: true },
  });
  const mailed = new Set(already.map((o) => o.activityId));
  const items = kept.filter((c) => !mailed.has(c.id));
  if (items.length === 0) return false;

  const locale = normalizeLocale(user.locale);
  const t = await getDictionary(locale);

  // Regroupe par tâche, puis par groupId (une sauvegarde multi-champs = 1 ligne).
  const byTask = new Map<string, { task: string; workspace: string; lines: string[]; seen: Set<string> }>();
  for (const c of items) {
    const g =
      byTask.get(c.taskId) ??
      { task: c.task.title, workspace: c.task.workspace.name, lines: [] as string[], seen: new Set<string>() };
    const groupKey = c.groupId ?? c.id;
    if (!g.seen.has(groupKey)) {
      g.seen.add(groupKey);
      g.lines.push(
        t.email.digestLine
          .replace("{actor}", c.actor.name)
          .replace("{detail}", describeActivity(c, t)),
      );
    }
    byTask.set(c.taskId, g);
  }

  const groups = [...byTask.values()].map((g) => ({ task: g.task, workspace: g.workspace, lines: g.lines }));
  const mail = digestEmail({ name: user.name, manageUrl: manageUrl(), groups }, t);

  await sendMail({ to: user.email, subject: mail.subject, body: mail.body, headers: mail.headers });
  await prisma.notificationOutbox.createMany({
    data: items.map((c) => ({ userId: user.id, activityId: c.id, kind: "DIGEST", sentAt: now })),
    skipDuplicates: true,
  });
  return true;
}
