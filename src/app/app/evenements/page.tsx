import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { getEventFeed } from "@/lib/events";
import { UserAvatar } from "@/components/UserAvatar";
import { MarkEventsRead } from "@/components/MarkEventsRead";
import { EventFilter } from "@/components/EventFilter";
import { formatDateTime } from "@/lib/labels";

export const metadata: Metadata = { title: "Événements — Taskflow" };

export default async function EvenementsPage({
  searchParams,
}: PageProps<"/app/evenements">) {
  const user = await requireUser();
  const sp = await searchParams;
  const includeOwn = sp.mine === "1";
  const groups = await getEventFeed(user.id, user.eventsReadAt ?? null, includeOwn);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MarkEventsRead />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Événements</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Les changements récents survenus sur les tâches que vous suivez (★), du plus
          récent au plus ancien. Suivez une tâche pour voir ses mises à jour apparaître ici.
        </p>
        <div className="mt-3">
          <EventFilter hideMine={!includeOwn} />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Aucun événement pour le moment. Suivez une tâche pour être informé de ses
          changements.
        </p>
      ) : (
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
                    <span className="shrink-0 text-xs text-zinc-400">
                      {formatDateTime(g.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    <span className="text-zinc-600 dark:text-zinc-300">{g.actorName}</span>{" "}
                    {g.summary}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">{g.task.workspace}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
