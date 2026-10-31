import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getTaskView } from "@/lib/view";
import { prisma } from "@/lib/prisma";
import { buildTaskIndex, toAssigneeInfo, type RawTask, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { UserAvatar } from "@/components/UserAvatar";
import { getEventFeed } from "@/lib/events";
import { getDiscussionRows } from "@/lib/discussions";
import { TaskCollection } from "@/components/TaskCollection";
import { TypeIcon } from "@/components/TypeIcon";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { EventList } from "@/components/EventList";
import { EventFilter } from "@/components/EventFilter";
import { DiscussionList } from "@/components/DiscussionList";

export default async function WorkspacePage({
  params,
  searchParams,
}: PageProps<"/app/workspaces/[workspaceId]">) {
  const user = await requireUser();
  const t = await getDictionary();
  const locale = await getLocale();
  const view = await getTaskView();
  const { workspaceId } = await params;
  const sp = await searchParams;
  const includeOwn = sp.mine === "1";
  const initialTab = sp.tab === "membres" ? "membres" : "projets";

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();

  const [workspace, allTasks, followedTasks, eventGroups, discussionRows] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        archivedAt: true,
        _count: { select: { members: true } },
        members: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            deactivatedAt: true,
            user: { select: { ...ASSIGNEE_SELECT, email: true } },
          },
        },
        invitations: {
          where: { acceptedAt: null },
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, expiresAt: true },
        },
      },
    }),
    // Projets = tâches de 1er niveau, du plus récent au plus ancien.
    prisma.task.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        parentId: true,
        assignee: { select: ASSIGNEE_SELECT },
      },
    }),
    prisma.taskFollow.findMany({
      where: { userId: user.id, following: true, task: { workspaceId } },
      orderBy: { createdAt: "desc" },
      select: {
        task: {
          select: { id: true, title: true, status: true, priority: true, parentId: true },
        },
      },
    }),
    getEventFeed(user.id, user.eventsReadAt ?? null, t, includeOwn, 50, workspaceId),
    getDiscussionRows(user.id, workspaceId),
  ]);
  if (!workspace) notFound();

  const { roots } = buildTaskIndex(allTasks as RawTask[]);
  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
  const isArchived = workspace.archivedAt !== null;

  // Filtrage d'accès : un non-administrateur ne voit que les projets auxquels il
  // a accès (visibles par tout l'espace, créés par lui, ou partagés avec lui).
  let visibleRoots = roots;
  if (!isAdmin) {
    const allowed = await prisma.task.findMany({
      where: {
        workspaceId,
        parentId: null,
        OR: [
          { visibility: "WORKSPACE" },
          { createdById: user.id },
          { access: { some: { userId: user.id } } },
        ],
      },
      select: { id: true },
    });
    const allowedIds = new Set(allowed.map((t) => t.id));
    visibleRoots = roots.filter((r) => allowedIds.has(r.id));
  }

  const roleLabel = (r: "OWNER" | "ADMIN" | "MEMBER") =>
    r === "MEMBER" ? t.members.roleUser : t.members.roleAdmin;

  // Tâches suivies par l'utilisateur (pour afficher l'œil sur les projets).
  const followedIds = new Set(followedTasks.map((f) => f.task.id));

  const projetsPanel = (
    <TaskCollection
      roots={visibleRoots}
      view={view}
      toggleBase={`/app/workspaces/${workspace.id}`}
      newTaskHref={isArchived ? null : `/app/tasks/new?workspace=${workspace.id}`}
      newTaskLabel={t.task.newProject}
      followedIds={followedIds}
      emptyLabel={t.task.noProjects}
    />
  );

  // Onglet « Membres » de la page de l'espace : lecture seule. La gestion
  // (invitations, rôles, désactivation) se fait dans la page Administration.
  const membresPanel = (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.members.list}</p>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {workspace.members.map((m) => {
          const deactivated = m.deactivatedAt !== null;
          return (
            <li
              key={m.id}
              className={`flex flex-wrap items-center justify-between gap-3 p-4 ${
                deactivated ? "bg-zinc-50 dark:bg-zinc-800/40" : "bg-white dark:bg-zinc-900"
              }`}
            >
              <div className={`flex min-w-0 items-center gap-3 ${deactivated ? "opacity-60" : ""}`}>
                <UserAvatar user={toAssigneeInfo(m.user)!} className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="font-medium">
                    {m.user.name}
                    {m.user.id === user.id && (
                      <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">{t.members.you}</span>
                    )}
                    {deactivated && (
                      <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-normal text-zinc-600 dark:text-zinc-300 dark:bg-zinc-700">
                        {t.members.deactivated}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{m.user.email}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {roleLabel(m.role)}
                {m.role === "OWNER" && ` ${t.members.creator}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const suiviesPanel = (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.workspace.followedDesc}</p>
      {followedTasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:border-zinc-700">
          {t.workspace.followedEmpty}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {followedTasks.map((f) => (
            <li key={f.task.id}>
              <Link
                href={`/app/tasks/${f.task.id}`}
                className="flex items-center justify-between gap-3 bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
              >
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <TypeIcon
                    isProject={f.task.parentId === null}
                    label={f.task.parentId === null ? t.task.prefixProject : t.task.prefixTask}
                  />
                  <span
                    className={`truncate text-sm font-medium ${
                      f.task.status === "DONE" ? "text-zinc-400 dark:text-zinc-500 line-through" : ""
                    }`}
                  >
                    {f.task.title}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={f.task.priority} />
                  <StatusBadge status={f.task.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const evenementsPanel = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.workspace.eventsDesc}</p>
        <EventFilter hideMine={!includeOwn} />
      </div>
      <EventList groups={eventGroups} emptyLabel={t.workspace.eventsEmpty} locale={locale} />
    </div>
  );

  const discussionsPanel = (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.workspace.discussionsDesc}</p>
      <DiscussionList
        rows={discussionRows}
        emptyLabel={t.workspace.discussionsEmpty}
        notFollowingLabel={t.workspace.notFollowing}
        locale={locale}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-zinc-400 dark:text-zinc-500">{t.workspace.prefix} </span>
            {workspace.name}
          </h1>
        </div>
        {isAdmin && (
          <ButtonLink href={`/app/workspaces/${workspace.id}/administration`} variant="secondary">
            {t.workspace.administration}
          </ButtonLink>
        )}
      </div>

      {isArchived && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-amber-800 dark:text-amber-300">{t.workspace.archivedBanner}</p>
        </div>
      )}

      <WorkspaceTabs
        key={workspace.id}
        initialTab={initialTab}
        memberCount={workspace._count.members}
        projets={projetsPanel}
        membres={membresPanel}
        suivies={suiviesPanel}
        evenements={evenementsPanel}
        discussions={discussionsPanel}
      />
    </div>
  );
}
