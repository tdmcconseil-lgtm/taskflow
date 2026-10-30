import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { canAccessTask } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PriorityBadge } from "@/components/badges";
import { StatusSelect } from "@/components/StatusSelect";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { TaskTabs } from "@/components/TaskTabs";
import { TaskFollowers } from "@/components/TaskFollowers";
import { DescriptionReveal } from "@/components/DescriptionReveal";
import { TaskForm } from "@/components/TaskForm";
import { TaskCollection } from "@/components/TaskCollection";
import { UserAvatar } from "@/components/UserAvatar";
import { CommentBox } from "@/components/CommentBox";
import { EditableComment } from "@/components/EditableComment";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TaskDocuments } from "@/components/TaskDocuments";
import { TaskDecisions } from "@/components/TaskDecisions";
import { updateTask } from "@/lib/actions/tasks";
import { toggleFollow } from "@/lib/actions/discussion";
import { buildTaskIndex, toAssigneeInfo, type RawTask, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { getTaskView, getTaskTab } from "@/lib/view";
import { formatDate, isOverdue, prefixedTitle } from "@/lib/labels";
import { cardClass } from "@/components/ui";

export default async function TaskDetailPage({
  params,
  searchParams,
}: PageProps<"/app/tasks/[taskId]">) {
  const user = await requireUser();
  const { taskId } = await params;
  const sp = await searchParams;
  const editing = sp.edit === "1";
  const view = await getTaskView();
  const initialTab = await getTaskTab();

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
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          editedAt: true,
          authorId: true,
          author: { select: { name: true } },
        },
      },
      followers: { where: { userId: user.id }, select: { following: true, lastReadAt: true } },
    },
  });
  if (!task) notFound();
  if (!(await getMembership(user.id, task.workspaceId))) notFound();
  if (!(await canAccessTask(user.id, task.id))) notFound();

  const isFollowing = task.followers[0]?.following === true;
  // Messages non lus du chat (seulement si l'on suit la tâche) — affichés sur
  // l'onglet tant qu'il n'est pas ouvert.
  const lastReadAt = task.followers[0]?.lastReadAt ?? null;
  const chatUnread = isFollowing
    ? task.comments.filter((c) => !lastReadAt || c.createdAt > lastReadAt).length
    : 0;

  const [workspace, allTasks, followerRows, activities, docLinks, poolDocs, ownDecisions] = await Promise.all([
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
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        parentId: true,
        assignee: { select: ASSIGNEE_SELECT },
        _count: { select: { documentLinks: true } },
      },
    }),
    prisma.taskFollow.findMany({
      where: { taskId: task.id, following: true },
      orderBy: { createdAt: "asc" },
      select: { user: { select: ASSIGNEE_SELECT } },
    }),
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
    prisma.documentLink.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: "desc" },
      select: { document: { select: { id: true, name: true, fileName: true } } },
    }),
    task.parentId === null
      ? prisma.document.findMany({
          where: { projectTaskId: task.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, fileName: true },
        })
      : Promise.resolve([] as { id: string; name: string; fileName: string }[]),
    prisma.decision.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        isProjectDecision: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        document: { select: { id: true, name: true } },
      },
    }),
  ]);
  if (!workspace) notFound();

  const linkedDocs = docLinks.map((l) => l.document);

  const rawTasks: RawTask[] = allTasks.map((t) => ({
    ...t,
    attachmentCount: t._count.documentLinks,
  }));
  const { byId } = buildTaskIndex(rawTasks);
  const children = byId.get(task.id)?.children ?? [];

  // Sous-tâches directes que l'utilisateur courant suit (pour l'œil 👁).
  const childIds = children.map((c) => c.id);
  const myChildFollows =
    childIds.length > 0
      ? await prisma.taskFollow.findMany({
          where: { userId: user.id, following: true, taskId: { in: childIds } },
          select: { taskId: true },
        })
      : [];
  const followedChildIds = new Set(myChildFollows.map((f) => f.taskId));

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

  // Documents du projet (tâche racine) — proposés dans le chat via « $ » et
  // utilisés pour afficher les références de document dans les messages.
  const rootId = ancestors[0]?.id ?? task.id;
  const projectDocs = await prisma.document.findMany({
    where: { projectTaskId: rootId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
  const docNameById = Object.fromEntries(
    [...projectDocs, ...linkedDocs].map((d) => [d.id, d.name]),
  );

  // Suiveurs de la tâche (onglet « Suivie par ») + membres pouvant être ajoutés.
  const followerList = followerRows.map((f) => toAssigneeInfo(f.user)!);
  const followerCount = followerList.length;
  const followerIds = new Set(followerList.map((f) => f.id));
  const followerCandidates = members.filter((m) => !followerIds.has(m.id));

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

        <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">Supprimer définitivement cette tâche.</span>
          <DeleteTaskButton taskId={task.id} />
        </div>
      </div>
    );
  }

  // --- Mode lecture ---
  const overdue = isOverdue(task.dueDate) && task.status !== "DONE";
  const isTopLevel = task.parentId === null;

  // Décisions propres à la tâche.
  const decisionItems = ownDecisions.map((d) => ({
    id: d.id,
    content: d.content,
    isProjectDecision: d.isProjectDecision,
    createdAt: d.createdAt,
    authorName: d.createdBy.name,
    document: d.document,
  }));

  // Remontée « décision projet » : sur la tâche racine, les décisions marquées
  // de tout le projet (racine + descendants).
  let projectDecisionItems: ((typeof decisionItems)[number] & {
    taskId: string;
    taskTitle: string;
  })[] = [];
  if (isTopLevel) {
    const projectTaskIds: string[] = [];
    const collect = (id: string) => {
      projectTaskIds.push(id);
      for (const c of byId.get(id)?.children ?? []) collect(c.id);
    };
    collect(task.id);
    const rows = await prisma.decision.findMany({
      where: { taskId: { in: projectTaskIds }, isProjectDecision: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        isProjectDecision: true,
        createdAt: true,
        taskId: true,
        task: { select: { title: true } },
        createdBy: { select: { name: true } },
        document: { select: { id: true, name: true } },
      },
    });
    projectDecisionItems = rows.map((d) => ({
      id: d.id,
      content: d.content,
      isProjectDecision: d.isProjectDecision,
      createdAt: d.createdAt,
      authorName: d.createdBy.name,
      document: d.document,
      taskId: d.taskId,
      taskTitle: d.task.title,
    }));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {breadcrumb}

      {/* Encadré d'en-tête : titre, suivi, statut, Modifier et données */}
      <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className={`text-2xl font-semibold tracking-tight ${
              task.status === "DONE" ? "text-zinc-400 line-through" : ""
            }`}
          >
            {prefixedTitle(task.title, task.parentId === null)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={toggleFollow}>
            <input type="hidden" name="taskId" value={task.id} />
            <button
              type="submit"
              title={isFollowing ? "Se désabonner" : "S'abonner à cette tâche"}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                isFollowing
                  ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                  : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              <span aria-hidden>👁</span>
              <span>{isFollowing ? "Abonné" : "S'abonner"}</span>
            </button>
          </form>
          <StatusSelect taskId={task.id} status={task.status} />
          <Link
            href={`${detailHref}?edit=1`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Modifier
          </Link>
        </div>
      </div>

        <DescriptionReveal
          banner={
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <dd className="mt-1">
                  <PriorityBadge priority={task.priority} />
                </dd>
              </div>
            </dl>
          }
          description={
            task.description ? (
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {task.description}
              </p>
            ) : (
              <p className="text-sm italic text-zinc-400">Aucune description.</p>
            )
          }
        />
      </div>

      {/* Onglets : Sous-tâches, Documents, Conversation, Suivi, Activité */}
      <TaskTabs
        taskId={task.id}
        initialTab={initialTab}
        chatUnread={chatUnread}
        followerCount={followerCount}
        activity={<ActivityFeed activities={activities} />}
        subtasks={
          <TaskCollection
            roots={children}
            view={view}
            toggleBase={detailHref}
            newTaskHref={`/app/tasks/new?parent=${task.id}`}
            newTaskLabel="Nouvelle sous-tâche"
            reorderParentId={task.id}
            followedIds={followedChildIds}
            emptyLabel={
              isTopLevel
                ? "Aucune tâche dans ce projet. Créez la première."
                : "Aucune sous-tâche."
            }
          />
        }
        documents={
          <TaskDocuments
            taskId={task.id}
            isTopLevel={isTopLevel}
            linked={linkedDocs}
            pool={poolDocs}
          />
        }
        decisions={
          <TaskDecisions
            taskId={task.id}
            isTopLevel={isTopLevel}
            decisions={decisionItems}
            projectDecisions={projectDecisionItems}
          />
        }
        chat={
          <div className="space-y-4">
            <CommentBox
              taskId={task.id}
              members={members}
              taskDocuments={linkedDocs}
              projectDocuments={projectDocs}
            />
            {task.comments.length === 0 ? (
              <p className="text-sm italic text-zinc-400">
                Aucun message. Lancez la conversation.
              </p>
            ) : (
              <ul className="space-y-3">
                {task.comments.map((c) => (
                  <EditableComment
                    key={c.id}
                    comment={{
                      id: c.id,
                      body: c.body,
                      createdAt: c.createdAt,
                      editedAt: c.editedAt,
                      authorId: c.authorId,
                      authorName: c.author.name,
                    }}
                    currentUserId={user.id}
                    names={nameById}
                    docs={docNameById}
                    taskId={task.id}
                    members={members}
                    taskDocuments={linkedDocs}
                    projectDocuments={projectDocs}
                  />
                ))}
              </ul>
            )}
          </div>
        }
        followers={
          <TaskFollowers
            taskId={task.id}
            followers={followerList}
            candidates={followerCandidates}
            currentUserId={user.id}
          />
        }
      />
    </div>
  );
}
