import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/actions/auth";
import { countNewEventGroups } from "@/lib/events";
import { FramedAvatar } from "@/components/FramedAvatar";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { userId: user.id, deactivatedAt: null } },
      archivedAt: null,
    },
    orderBy: { createdAt: "asc" },
    include: {
      // Les « projets » sont les tâches de 1er niveau (sans parent).
      tasks: {
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true },
      },
    },
  });

  // Nombre de discussions non lues (parmi les tâches encore suivies).
  const follows = await prisma.taskFollow.findMany({
    where: { userId: user.id, following: true },
    select: {
      taskId: true,
      lastReadAt: true,
      task: {
        select: {
          comments: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        },
      },
    },
  });
  const unreadCount = follows.filter((f) => {
    const last = f.task.comments[0]?.createdAt;
    return !!last && (!f.lastReadAt || last > f.lastReadAt);
  }).length;
  // Projets (tâches) auxquels l'utilisateur est abonné — pour l'œil dans le menu.
  const followedIds = new Set(follows.map((f) => f.taskId));

  // Nombre d'événements nouveaux depuis la dernière consultation.
  const eventsCount = await countNewEventGroups(user.id, user.eventsReadAt ?? null);

  // Espace en cours de visite — on ne déplie que ses projets dans le menu.
  const pathname = (await headers()).get("x-pathname") ?? "";
  let activeWorkspaceId: string | null = null;
  const wsMatch = pathname.match(/^\/app\/workspaces\/([^/]+)/);
  if (wsMatch) {
    activeWorkspaceId = wsMatch[1];
  } else {
    const taskMatch = pathname.match(/^\/app\/tasks\/([^/]+)/);
    if (taskMatch) {
      const t = await prisma.task.findUnique({
        where: { id: taskMatch[1] },
        select: { workspaceId: true },
      });
      activeWorkspaceId = t?.workspaceId ?? null;
    }
  }

  return (
    <div className="flex min-h-full flex-1">
      {/* Barre latérale */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white p-4 md:flex dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/app" className="mb-6 block text-lg font-semibold tracking-tight">
          Taskflow
        </Link>

        <nav className="flex-1 space-y-6 overflow-y-auto">
          <div className="space-y-0.5">
            <Link
              href="/app"
              className="block rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              🏠 Accueil
            </Link>
            <Link
              href="/app/discussions"
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span>💬 Discussions</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/app/evenements"
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span>🔔 Événements</span>
              {eventsCount > 0 && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {eventsCount > 99 ? "99+" : eventsCount}
                </span>
              )}
            </Link>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Espaces
              </span>
              <Link
                href="/app/workspaces/new"
                className="text-sm text-indigo-600 hover:underline"
                title="Nouvel espace de travail"
              >
                +
              </Link>
            </div>

            <ul className="space-y-3">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspaceId;
                return (
                  <li key={ws.id}>
                    <Link
                      href={`/app/workspaces/${ws.id}`}
                      className={`block truncate rounded-lg px-2 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                        isActive ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white" : ""
                      }`}
                    >
                      {ws.name}
                    </Link>
                    {isActive && (
                      <ul className="mt-1 space-y-0.5 border-l border-zinc-200 pl-3 dark:border-zinc-800">
                        {ws.tasks.map((t) => (
                          <li key={t.id}>
                            <Link
                              href={`/app/tasks/${t.id}`}
                              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                              <span className="truncate">{t.title}</span>
                              {followedIds.has(t.id) && (
                                <span
                                  className="shrink-0"
                                  title="Vous êtes abonné"
                                  aria-label="Abonné"
                                >
                                  👁
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                        {ws.tasks.length === 0 && (
                          <li className="px-2 py-1 text-xs italic text-zinc-400">
                            Aucun projet
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <Link href="/app" className="text-sm font-semibold md:hidden">
            Taskflow
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/app/profile"
              className="flex items-center gap-2 text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
            >
              <FramedAvatar
                src={`/api/avatar/${user.id}?v=${user.photoUpdatedAt?.getTime() ?? 0}`}
                fx={user.photoX}
                fy={user.photoY}
                zoom={user.photoZoom}
                fallback={user.name.trim()[0]?.toUpperCase() ?? "?"}
                className="h-7 w-7 shrink-0 rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              />
              <span>{user.name}</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
