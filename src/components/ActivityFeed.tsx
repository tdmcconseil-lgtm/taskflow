import { UserAvatar } from "@/components/UserAvatar";
import { toAssigneeInfo, type RawTask } from "@/lib/task-tree";
import { STATUS_LABELS, PRIORITY_LABELS, formatDateTime } from "@/lib/labels";
import type { TaskStatus, TaskPriority, TaskActivityType } from "@/generated/prisma/client";

type ActorInfo = NonNullable<RawTask["assignee"]>;

export type Activity = {
  id: string;
  type: TaskActivityType;
  fromValue: string | null;
  toValue: string | null;
  targetName: string | null;
  createdAt: Date;
  actor: ActorInfo;
};

function describe(a: Activity): string {
  switch (a.type) {
    case "CREATED":
      return "a créé cette tâche";
    case "STATUS_CHANGED":
      return `a changé le statut : ${STATUS_LABELS[a.fromValue as TaskStatus]} → ${STATUS_LABELS[a.toValue as TaskStatus]}`;
    case "PRIORITY_CHANGED":
      return `a changé la priorité : ${PRIORITY_LABELS[a.fromValue as TaskPriority]} → ${PRIORITY_LABELS[a.toValue as TaskPriority]}`;
    case "DUE_DATE_CHANGED":
      if (!a.fromValue && a.toValue) return `a défini l'échéance au ${a.toValue}`;
      if (a.fromValue && !a.toValue) return "a retiré l'échéance";
      return `a modifié l'échéance : ${a.fromValue} → ${a.toValue}`;
    case "ASSIGNED":
      if (!a.targetName) return "a retiré l'assignation";
      if (a.fromValue) return `a réassigné de ${a.fromValue} à ${a.targetName}`;
      return `a assigné à ${a.targetName}`;
    case "TITLE_CHANGED":
      return `a renommé : « ${a.fromValue} » → « ${a.toValue} »`;
    case "DESCRIPTION_CHANGED":
      return "a modifié la description";
    case "SUBTASK_ADDED":
      return `a ajouté la sous-tâche « ${a.targetName} »`;
    case "SUBTASK_REMOVED":
      return `a supprimé la sous-tâche « ${a.targetName} »`;
    default:
      return "a modifié la tâche";
  }
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm italic text-zinc-400">Aucune activité pour le moment.</p>;
  }
  return (
    <ul className="space-y-3">
      {activities.map((a) => (
        <li
          key={a.id}
          className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
        >
          <UserAvatar user={toAssigneeInfo(a.actor)!} className="mt-0.5 h-5 w-5" />
          <p>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{a.actor.name}</span>{" "}
            {describe(a)}
            <span className="ml-1 text-xs text-zinc-400">· {formatDateTime(a.createdAt)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
