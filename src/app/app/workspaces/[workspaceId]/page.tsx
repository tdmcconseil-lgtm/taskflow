import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { archiveWorkspace, unarchiveWorkspace, cancelInvitation } from "@/lib/actions/workspaces";
import { buildTaskIndex, type RawTask, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { getEventFeed } from "@/lib/events";
import { getDiscussionRows } from "@/lib/discussions";
import { getWorkspaceTab } from "@/lib/view";
import { TaskRow } from "@/components/TaskRow";
import { StatusBadge } from "@/components/badges";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { EventList } from "@/components/EventList";
import { EventFilter } from "@/components/EventFilter";
import { DiscussionList } from "@/components/DiscussionList";
import { formatDate } from "@/lib/labels";

export default async function WorkspacePage({
  params,
  searchParams,
}: PageProps<"/app/workspaces/[workspaceId]">) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const sp = await searchParams;
  const includeOwn = sp.mine === "1";

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();

  const initialTab = await getWorkspaceTab();

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
            user: { select: { id: true, name: true, email: true } },
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
      select: { task: { select: { id: true, title: true, status: true } } },
    }),
    getEventFeed(user.id, user.eventsReadAt ?? null, includeOwn, 50, workspaceId),
    getDiscussionRows(user.id, workspaceId),
  ]);
  if (!workspace) notFound();

  const { roots } = buildTaskIndex(allTasks as RawTask[]);
  const isOwner = membership.role === "OWNER";
  const isArchived = workspace.archivedAt !== null;

  const projetsPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projets</h2>
        {!isArchived && (
          <Link
            href={`/app/tasks/new?workspace=${workspace.id}`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Nouveau projet
          </Link>
        )}
      </div>
      {roots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Aucun projet. Créez-en un pour commencer.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {roots.map((node) => (
            <TaskRow key={node.id} node={node} />
          ))}
        </ul>
      )}
    </div>
  );

  const membresPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Membres</h2>
        <Link
          href={`/app/workspaces/${workspace.id}/members/new`}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Inviter un membre
        </Link>
      </div>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {workspace.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between bg-white p-4 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium">
                {m.user.name}
                {m.user.id === user.id && (
                  <span className="ml-2 text-xs text-zinc-400">(vous)</span>
                )}
              </p>
              <p className="text-sm text-zinc-500">{m.user.email}</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {m.role === "OWNER" ? "Propriétaire" : "Membre"}
            </span>
          </li>
        ))}
      </ul>

      {workspace.invitations.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Invitations en attente
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
                        <span className="text-red-600 dark:text-red-400">Expirée</span>
                      ) : (
                        <>En attente · expire le {formatDate(inv.expiresAt)}</>
                      )}
                    </p>
                  </div>
                  <form action={cancelInvitation}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:hover:bg-red-950/50"
                    >
                      Annuler
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
      <h2 className="text-lg font-semibold">Tâches suivies</h2>
      {followedTasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Vous ne suivez aucune tâche dans cet espace.
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
                  {f.task.title}
                </span>
                <StatusBadge status={f.task.status} />
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
        <h2 className="text-lg font-semibold">Événements</h2>
        <EventFilter hideMine={!includeOwn} />
      </div>
      <EventList groups={eventGroups} emptyLabel="Aucun événement dans cet espace." />
    </div>
  );

  const discussionsPanel = (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Discussions</h2>
      <DiscussionList rows={discussionRows} emptyLabel="Aucune discussion dans cet espace." />
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/app" className="text-sm text-zinc-500 hover:underline">
            ← Accueil
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{workspace.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {workspace._count.members} membre{workspace._count.members > 1 ? "s" : ""}
          </p>
        </div>
        {isOwner && !isArchived && (
          <form action={archiveWorkspace}>
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Archiver
            </button>
          </form>
        )}
      </div>

      {isArchived && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-amber-800 dark:text-amber-300">
            Cet espace est archivé — masqué de votre liste active.
          </p>
          {isOwner && (
            <div className="flex items-center gap-2">
              <form action={unarchiveWorkspace}>
                <input type="hidden" name="workspaceId" value={workspace.id} />
                <button
                  type="submit"
                  className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/50"
                >
                  Désarchiver
                </button>
              </form>
              <Link
                href={`/app/workspaces/${workspace.id}/delete`}
                className="rounded-md border border-red-400 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
              >
                Supprimer définitivement
              </Link>
            </div>
          )}
        </div>
      )}

      <WorkspaceTabs
        initialTab={initialTab}
        projets={projetsPanel}
        membres={membresPanel}
        suivies={suiviesPanel}
        evenements={evenementsPanel}
        discussions={discussionsPanel}
      />
    </div>
  );
}
