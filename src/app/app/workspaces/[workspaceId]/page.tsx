import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { getDictionary } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { archiveWorkspace, unarchiveWorkspace, cancelInvitation } from "@/lib/actions/workspaces";
import { buildTaskIndex, toAssigneeInfo, type RawTask, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { UserAvatar } from "@/components/UserAvatar";
import { MemberControls } from "@/components/MemberControls";
import { getEventFeed } from "@/lib/events";
import { getDiscussionRows } from "@/lib/discussions";
import { TaskRow } from "@/components/TaskRow";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { EventList } from "@/components/EventList";
import { EventFilter } from "@/components/EventFilter";
import { DiscussionList } from "@/components/DiscussionList";
import { formatDate, prefixedTitle } from "@/lib/labels";

export default async function WorkspacePage({
  params,
  searchParams,
}: PageProps<"/app/workspaces/[workspaceId]">) {
  const user = await requireUser();
  const t = await getDictionary();
  const { workspaceId } = await params;
  const sp = await searchParams;
  const includeOwn = sp.mine === "1";

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
  const isOwner = membership.role === "OWNER";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">{t.task.projectsList}</p>
        {!isArchived && (
          <Link
            href={`/app/tasks/new?workspace=${workspace.id}`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            {t.task.newProject}
          </Link>
        )}
      </div>
      {visibleRoots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {t.task.noProjects}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {visibleRoots.map((node) => (
            <TaskRow key={node.id} node={node} followed={followedIds.has(node.id)} />
          ))}
        </ul>
      )}
    </div>
  );

  const membresPanel = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">{t.members.list}</p>
        {isAdmin && (
          <Link
            href={`/app/workspaces/${workspace.id}/members/new`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            {t.members.invite}
          </Link>
        )}
      </div>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {workspace.members.map((m) => {
          const deactivated = m.deactivatedAt !== null;
          const canManage = isAdmin && m.role !== "OWNER" && m.user.id !== user.id;
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
                      <span className="ml-2 text-xs text-zinc-400">{t.members.you}</span>
                    )}
                    {deactivated && (
                      <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-normal text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        {t.members.deactivated}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-zinc-500">{m.user.email}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {roleLabel(m.role)}
                  {m.role === "OWNER" && ` ${t.members.creator}`}
                </span>
                {canManage && (
                  <MemberControls
                    workspaceId={workspace.id}
                    memberUserId={m.user.id}
                    role={m.role === "ADMIN" ? "ADMIN" : "MEMBER"}
                    deactivated={deactivated}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {workspace.invitations.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t.members.pendingInvitations}
          </h3>
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-dashed border-zinc-300 dark:divide-zinc-800 dark:border-zinc-700">
            {workspace.invitations.map((inv) => {
              const expired = inv.expiresAt.getTime() < Date.now();
              return (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 bg-white p-4 dark:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.email}</p>
                    <p className="text-xs text-zinc-500">
                      {expired ? (
                        <span className="text-red-600 dark:text-red-400">{t.members.expired}</span>
                      ) : (
                        <>
                          {t.members.pendingExpires} {formatDate(inv.expiresAt)}
                        </>
                      )}
                    </p>
                  </div>
                  <form action={cancelInvitation}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:hover:bg-red-950/50"
                    >
                      {t.members.cancel}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );

  const suiviesPanel = (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">{t.workspace.followedDesc}</p>
      {followedTasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
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
                <span
                  className={`truncate text-sm font-medium ${
                    f.task.status === "DONE" ? "text-zinc-400 line-through" : ""
                  }`}
                >
                  {f.task.parentId === null ? t.task.prefixProject : t.task.prefixTask} :{" "}
                  {f.task.title}
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
        <p className="text-sm text-zinc-500">{t.workspace.eventsDesc}</p>
        <EventFilter hideMine={!includeOwn} />
      </div>
      <EventList groups={eventGroups} emptyLabel={t.workspace.eventsEmpty} />
    </div>
  );

  const discussionsPanel = (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">{t.workspace.discussionsDesc}</p>
      <DiscussionList
        rows={discussionRows}
        emptyLabel={t.workspace.discussionsEmpty}
        notFollowingLabel={t.workspace.notFollowing}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-zinc-400">{t.workspace.prefix} </span>
            {workspace.name}
          </h1>
        </div>
        {isOwner && !isArchived && (
          <form action={archiveWorkspace}>
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {t.workspace.archive}
            </button>
          </form>
        )}
      </div>

      {isArchived && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-amber-800 dark:text-amber-300">{t.workspace.archivedBanner}</p>
          {isOwner && (
            <div className="flex items-center gap-2">
              <form action={unarchiveWorkspace}>
                <input type="hidden" name="workspaceId" value={workspace.id} />
                <button
                  type="submit"
                  className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/50"
                >
                  {t.workspace.unarchive}
                </button>
              </form>
              <Link
                href={`/app/workspaces/${workspace.id}/delete`}
                className="rounded-md border border-red-400 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
              >
                {t.workspace.deletePermanently}
              </Link>
            </div>
          )}
        </div>
      )}

      <WorkspaceTabs
        key={workspace.id}
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
