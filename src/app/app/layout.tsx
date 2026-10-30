import Link from "next/link";
import { headers, cookies } from "next/headers";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/actions/auth";
import { countNewEventGroups } from "@/lib/events";
import { FramedAvatar } from "@/components/FramedAvatar";
import { WorkspaceNav } from "@/components/WorkspaceNav";
import { MobileDrawer } from "@/components/MobileDrawer";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { MenuLocaleSwitcher } from "@/components/MenuLocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getDictionary(locale);

  // Thème choisi (cookie par appareil) : utilisé pour afficher l'interrupteur dans
  // le bon état dès le rendu serveur. Absent = choix jamais fait (préférence système).
  const themeCookie = (await cookies()).get("tf_theme")?.value;
  const initialDark = themeCookie === "dark" ? true : themeCookie === "light" ? false : undefined;

  // Espaces où l'utilisateur est administrateur (il y voit tous les projets).
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, deactivatedAt: null },
    select: { workspaceId: true, role: true },
  });
  const adminWorkspaceIds = memberships
    .filter((m) => m.role === "OWNER" || m.role === "ADMIN")
    .map((m) => m.workspaceId);

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { userId: user.id, deactivatedAt: null } },
      archivedAt: null,
    },
    orderBy: { createdAt: "asc" },
    include: {
      // Les « projets » sont les tâches de 1er niveau (sans parent), filtrés
      // selon l'accès : visibles par tout l'espace, créés par l'utilisateur,
      // partagés avec lui, ou tous s'il est administrateur de l'espace.
      tasks: {
        where: {
          parentId: null,
          OR: [
            { visibility: "WORKSPACE" },
            { createdById: user.id },
            { access: { some: { userId: user.id } } },
            { workspaceId: { in: adminWorkspaceIds } },
          ],
        },
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
  // Hors d'un espace/tâche (Accueil, Discussions, Événements…) ou après un
  // rechargement : on conserve le dernier espace visité (cookie) afin de ne pas
  // vider la liste des projets dans le menu.
  if (!activeWorkspaceId) {
    const remembered = (await cookies()).get("tf_ws")?.value;
    if (remembered && workspaces.some((w) => w.id === remembered)) {
      activeWorkspaceId = remembered;
    }
  }

  const nav = (
    <>
      <Link href="/app" className="mb-6 block text-lg font-semibold tracking-tight">
        Taskflow
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        <div className="space-y-0.5">
          <Link
            href="/app"
            className="block rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            🏠 {t.nav.home}
          </Link>
          <Link
            href="/app/discussions"
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span>💬 {t.nav.discussions}</span>
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
            <span>🔔 {t.nav.events}</span>
            {eventsCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                {eventsCount > 99 ? "99+" : eventsCount}
              </span>
            )}
          </Link>
        </div>

        <WorkspaceNav workspaces={workspaces} initialActiveId={activeWorkspaceId} />
      </nav>

      {/* Langue : sélecteur déroulant (ouverture vers le haut) tout en bas du menu. */}
      <MenuLocaleSwitcher locale={locale} label={t.common.language} />

      {/* Thème clair / sombre : interrupteur tout en bas du menu (vert = sombre). */}
      <ThemeToggle label={t.theme.darkMode} initialDark={initialDark} />
    </>
  );

  return (
    <div className="flex min-h-full flex-1">
      {/* Barre latérale (bureau) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white p-4 md:flex dark:border-zinc-800 dark:bg-zinc-900">
        {nav}
      </aside>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            {/* Menu en tiroir (mobile) : reprend la même navigation */}
            <MobileDrawer>{nav}</MobileDrawer>
            <Link href="/app" className="text-sm font-semibold md:hidden">
              Taskflow
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
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
                className="h-7 w-7 shrink-0 rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:text-zinc-300 dark:bg-zinc-700"
              />
              <span className="hidden sm:inline">{user.name}</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {t.nav.logout}
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
