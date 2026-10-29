import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { archiveWorkspace, unarchiveWorkspace } from "@/lib/actions/workspaces";
import { TaskCollection } from "@/components/TaskCollection";
import { buildTaskIndex, type RawTask, ASSIGNEE_SELECT } from "@/lib/task-tree";

export default async function WorkspacePage({
  params,
  searchParams,
}: PageProps<"/app/workspaces/[workspaceId]">) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const sp = await searchParams;
  const view = sp.vue === "liste" ? "liste" : "tableau";

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();

  const [workspace, allTasks] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        archivedAt: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.task.findMany({
      where: { workspaceId },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
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
  ]);
  if (!workspace) notFound();

  const { roots } = buildTaskIndex(allTasks as RawTask[]);
  const isOwner = membership.role === "OWNER";
  const isArchived = workspace.archivedAt !== null;

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
        <div className="flex items-center gap-2">
          <Link
            href={`/app/workspaces/${workspace.id}/members`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            👥 Membres
          </Link>
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Projets</h2>
        <TaskCollection
          roots={roots}
          view={view}
          toggleBase={`/app/workspaces/${workspace.id}`}
          newTaskHref={isArchived ? null : `/app/tasks/new?workspace=${workspace.id}`}
          newTaskLabel="Nouveau projet"
          emptyLabel="Aucun projet. Créez-en un pour commencer."
        />
      </section>
    </div>
  );
}
