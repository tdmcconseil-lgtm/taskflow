import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/labels";

export const metadata: Metadata = { title: "Discussions — Taskflow" };

export default async function DiscussionsPage() {
  const user = await requireUser();

  // Toutes les tâches suivies (ou suivies par le passé) — la discussion reste
  // dans la liste même après désabonnement.
  const follows = await prisma.taskFollow.findMany({
    where: { userId: user.id },
    select: {
      following: true,
      lastReadAt: true,
      task: {
        select: {
          id: true,
          title: true,
          workspace: { select: { name: true } },
          comments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true, body: true, author: { select: { name: true } } },
          },
        },
      },
    },
  });

  const rows = follows
    .filter((f) => f.task.comments.length > 0)
    .map((f) => {
      const last = f.task.comments[0];
      // Non lu seulement si la tâche est encore suivie.
      const unread = f.following && (!f.lastReadAt || last.createdAt > f.lastReadAt);
      return {
        id: f.task.id,
        title: f.task.title,
        workspace: f.task.workspace.name,
        following: f.following,
        last,
        unread,
      };
    })
    .sort((a, b) => b.last.createdAt.getTime() - a.last.createdAt.getTime());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Discussions</h1>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Aucune discussion. Suivez une tâche ou écrivez un message pour en voir apparaître ici.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/tasks/${r.id}`}
                className="flex items-start gap-3 bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    r.unread ? "bg-indigo-600" : "bg-transparent"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate ${
                        r.unread ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {r.title}
                      {!r.following && (
                        <span className="ml-2 text-xs font-normal text-zinc-400">
                          (plus suivie)
                        </span>
                      )}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {formatDateTime(r.last.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-500">
                    <span className="text-zinc-600 dark:text-zinc-300">
                      {r.last.author.name}
                    </span>{" "}
                    · {r.last.body}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">{r.workspace}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
