import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { StatusSelect } from "@/components/StatusSelect";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { MarkDiscussionRead } from "@/components/MarkDiscussionRead";
import { TaskForm } from "@/components/TaskForm";
import { TaskCollection } from "@/components/TaskCollection";
import { UserAvatar } from "@/components/UserAvatar";
import { CommentBox } from "@/components/CommentBox";
import { CommentBody } from "@/components/CommentBody";
import { ActivityFeed } from "@/components/ActivityFeed";
import { updateTask } from "@/lib/actions/tasks";
import { toggleFollow } from "@/lib/actions/discussion";
import { buildTaskIndex, toAssigneeInfo, type RawTask, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { formatDate, formatDateTime, isOverdue, PRIORITY_LABELS } from "@/lib/labels";
import { cardClass } from "@/components/ui";

export default async function TaskDetailPage({
  params,
  searchParams,
}: PageProps<"/app/tasks/[taskId]">) {
  const user = await requireUser();
  const { taskId } = await params;
  const sp = await searchParams;
  const editing = sp.edit === "1";
  const view = sp.vue === "liste" ? "liste" : "tableau";

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      parentId: true,
      assigneeId: true,
      workspaceId: true,
      assignee: { select: ASSIGNEE_SELECT },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
      followers: { where: { userId: user.id }, select: { following: true } },
    },
  });
  if (!task) notFound();
  if (!(await getMembership(user.id, task.workspaceId))) notFound();

  const isFollowing = task.followers[0]?.following === true;

  const [workspace, allTasks, followerCount, activities] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: task.workspaceId },
      select: {
        id: true,
        name: true,
        members: {
          orderBy: { createdAt: "asc" },
          select: { user: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.task.findMany({
      where: { workspaceId: task.workspaceId },
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
    prisma.taskFollow.count({ where: { taskId: task.id, following: true } }),
    prisma.taskActivity.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        fromValue: true,
        toValue: true,
        targetName: true,
        createdAt: true,
        actor: { select: ASSIGNEE_SELECT },
      },
    }),
  ]);
  if (!workspace) notFound();

  const { byId } = buildTaskIndex(allTasks as RawTask[]);
  const children = byId.get(task.id)?.children ?? [];

  // Fil d'Ariane : espace › ancêtres › tâche courante.
  const rawById = new Map(allTasks.map((t) => [t.id, t]));
  const ancestors: { id: string; title: string }[] = [];
  let cursor = task.parentId;
  while (cursor) {
    const a = rawById.get(cursor);
    if (!a) break;
    ancestors.unshift({ id: a.id, title: a.title });
    cursor = a.parentId;
  }

  const detailHref = `/app/tasks/${task.id}`;
  const members = workspace.members.map((m) => m.user);
  const nameById = Object.fromEntries(members.map((m) => [m.id, m.name]));

  const breadcrumb = (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
      <Link href={`/app/workspaces/${workspace.id}`} className="hover:underline">
        {workspace.name}
      </Link>
      {ancestors.map((a) => (
        <span key={a.id} className="flex items-center gap-1">
          <span className="text-zinc-300 dark:text-zinc-600">›</span>
          <Link href={`/app/tasks/${a.id}`} className="hover:underline">
            {a.title}
          </Link>
        </span>
      ))}
      <span className="text-zinc-300 dark:text-zinc-600">›</span>
      <span className="text-zinc-700 dark:text-zinc-300">{task.title}</span>
    </nav>
  );

  // --- Mode édition ---
  if (editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {breadcrumb}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Modifier</h1>
          <Link href={detailHref} className="text-sm text-zinc-500 hover:underline">
            Annuler
          </Link>
        </div>
        <div className={cardClass}>
          <TaskForm
            action={updateTask}
            members={members}
            hidden={{ taskId: task.id }}
            defaults={{
              title: task.title,
              description: task.description ?? undefined,
              assigneeId: task.assigneeId ?? undefined,
              priority: task.priority,
              dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : undefined,
            }}
            submitLabel="Enregistrer"
          />
        </div>
      </div>
    );
  }

  // --- Mode lecture ---
  const overdue = isOverdue(task.dueDate) && task.status !== "DONE";
  const isTopLevel = task.parentId === null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <MarkDiscussionRead taskId={task.id} />
      {breadcrumb}

      {/* Partie 1 : en-tête + bandeau de données + description */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className={`text-2xl font-semibold tracking-tight ${
              task.status === "DONE" ? "text-zinc-400 line-through" : ""
            }`}
          >
            {task.title}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={toggleFollow}>
            <input type="hidden" name="taskId" value={task.id} />
            <button
              type="submit"
              title={isFollowing ? "Ne plus suivre" : "Suivre cette tâche"}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                isFollowing
                  ? "border-yellow-300 bg-yellow-50 text-yellow-600 dark:border-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"
                  : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{isFollowing ? "★" : "☆"}</span>
              <span>{followerCount}</span>
            </button>
          </form>
          <StatusSelect taskId={task.id} status={task.status} />
          <Link
            href={`${detailHref}?edit=1`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Modifier
          </Link>
          <DeleteTaskButton taskId={task.id} />
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">Assigné à</dt>
          <dd className="mt-1 text-sm">
            {task.assignee ? (
              <span className="inline-flex items-center gap-2">
                <UserAvatar user={toAssigneeInfo(task.assignee)!} className="h-6 w-6" />
                {task.assignee.name}
              </span>
            ) : (
              "Non assignée"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">Échéance</dt>
          <dd
            className={`mt-1 text-sm ${
              overdue ? "font-medium text-red-600 dark:text-red-400" : ""
            }`}
          >
            {task.dueDate ? formatDate(task.dueDate) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">Priorité</dt>
          <dd className="mt-1 text-sm">{PRIORITY_LABELS[task.priority]}</dd>
        </div>
      </dl>

      <div>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Description
        </h2>
        {task.description ? (
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {task.description}
          </p>
        ) : (
          <p className="text-sm italic text-zinc-400">Aucune description.</p>
        )}
      </div>

      {/* Partie 2 : sous-tâches présentées comme la liste des tâches d'un projet */}
      <section className="space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Sous-tâches</h2>
        <TaskCollection
          roots={children}
          view={view}
          toggleBase={detailHref}
          newTaskHref={`/app/tasks/new?parent=${task.id}`}
          newTaskLabel="Nouvelle sous-tâche"
          emptyLabel={
            isTopLevel
              ? "Aucune tâche dans ce projet. Créez la première."
              : "Aucune sous-tâche."
          }
        />
      </section>

      {/* Discussion */}
      <section className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Discussion</h2>

        {task.comments.length === 0 ? (
          <p className="text-sm italic text-zinc-400">
            Aucun message. Lancez la discussion.
          </p>
        ) : (
          <ul className="space-y-3">
            {task.comments.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {c.author.name}
                  </span>
                  <span>·</span>
                  <span>{formatDateTime(c.createdAt)}</span>
                </div>
                <CommentBody body={c.body} names={nameById} />
              </li>
            ))}
          </ul>
        )}

        <CommentBox taskId={task.id} members={members} />
      </section>

      {/* Activité (journal d'audit, en lecture seule) */}
      <section className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Activité</h2>
        <ActivityFeed activities={activities} />
      </section>
    </div>
  );
}
