import { UserAvatar } from "@/components/UserAvatar";
import { toAssigneeInfo, type RawTask } from "@/lib/task-tree";
import { formatDateTime } from "@/lib/labels";
import { describeActivity } from "@/lib/activity-text";
import type { TaskActivityType } from "@/generated/prisma/client";

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
            {describeActivity(a)}
            <span className="ml-1 text-xs text-zinc-400">· {formatDateTime(a.createdAt)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
