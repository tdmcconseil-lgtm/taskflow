import Link from "next/link";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDateTime } from "@/lib/labels";
import type { EventGroup } from "@/lib/events";
import type { Locale } from "@/lib/i18n/config";

export function EventList({
  groups,
  emptyLabel,
  locale = "fr",
}: {
  groups: EventGroup[];
  emptyLabel: string;
  locale?: Locale;
}) {
  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:text-zinc-300 dark:border-zinc-700">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {groups.map((g) => (
        <li key={g.key}>
          <Link
            href={`/app/tasks/${g.task.id}`}
            className="flex items-start gap-3 bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
          >
            <span
              className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                g.unread ? "bg-indigo-600" : "bg-transparent"
              }`}
              aria-hidden
            />
            <UserAvatar user={g.actor} className="mt-0.5 h-6 w-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate ${g.unread ? "font-semibold" : "font-medium"}`}>
                  {g.task.title}
                </p>
                <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-300">
                  {formatDateTime(g.createdAt, locale)}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-300">
                <span className="text-zinc-600 dark:text-zinc-300">{g.actorName}</span>{" "}
                {g.summary}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-300">{g.task.workspace}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
