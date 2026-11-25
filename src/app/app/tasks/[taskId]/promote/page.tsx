import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { canManageProject } from "@/lib/access";
import { getDictionary } from "@/lib/i18n/server";
import { UserAvatar } from "@/components/UserAvatar";
import { TypeIcon } from "@/components/TypeIcon";
import { toAssigneeInfo, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { cardClass } from "@/components/ui";
import { PromoteConfirm } from "@/components/PromoteConfirm";

// Page de confirmation de la transformation d'une tâche de 1er niveau en projet
// autonome. Elle calcule côté serveur les membres amorcés (opérateur + porteurs
// du sous-arbre + auteur d'origine) et l'avertissement de cloisonnement, puis
// délègue la validation à un bouton client appelant l'action.
export default async function PromoteTaskPage({
  params,
}: PageProps<"/app/tasks/[taskId]/promote">) {
  const user = await requireUser();
  const t = await getDictionary();
  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      parentId: true,
      workspaceId: true,
      assigneeId: true,
      createdById: true,
    },
  });
  if (!task) notFound();
  if (!(await getMembership(user.id, task.workspaceId))) notFound();
  if (task.parentId === null) notFound(); // déjà un projet

  // La tâche doit être de 1er niveau : son parent est un projet (racine).
  const parentProject = await prisma.task.findUnique({
    where: { id: task.parentId },
    select: { id: true, title: true, parentId: true, workspaceId: true, createdById: true, visibility: true },
  });
  if (!parentProject || parentProject.parentId !== null) notFound();
  // Réservé à un ADMIN du projet source (ou l'OWNER de l'espace).
  if (!(await canManageProject(user.id, parentProject))) notFound();

  // Porteurs (assignees) de la tâche + de toute sa descendance.
  const assigneeIds = new Set<string>();
  if (task.assigneeId) assigneeIds.add(task.assigneeId);
  let frontier: string[] = [task.id];
  let depth = 0;
  while (frontier.length > 0 && depth++ < 100) {
    const rows = await prisma.task.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true, assigneeId: true },
    });
    frontier = rows.map((r) => r.id);
    for (const r of rows) if (r.assigneeId) assigneeIds.add(r.assigneeId);
  }

  // Membres amorcés : opérateur (ADMIN) + porteurs du sous-arbre (MEMBER).
  // L'auteur d'origine n'est PAS amorcé (createdById préservé ; son accès de
  // créateur est montré dans la page des membres du projet).
  const memberIds = new Set<string>(assigneeIds);
  memberIds.add(user.id);
  const users = await prisma.user.findMany({
    where: { id: { in: [...memberIds] } },
    select: { ...ASSIGNEE_SELECT, email: true },
  });
  const seeded = users
    .map((u) => ({ user: u, isAdmin: u.id === user.id }))
    .sort((a, b) => (a.isAdmin === b.isAdmin ? a.user.name.localeCompare(b.user.name) : a.isAdmin ? -1 : 1));

  const parentOpen = parentProject.visibility === "WORKSPACE";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.promoteToProject.title}</h1>
        <Link
          href={`/app/tasks/${task.id}`}
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          {t.promoteToProject.backToTask}
        </Link>
      </div>

      <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <TypeIcon isProject={false} label={t.task.prefixTask} />
        <span className="font-medium">« {task.title} »</span>
      </p>

      {/* Alerte mise en évidence : on crée une entité autonome avec ses règles. */}
      <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/40">
        <p className="flex items-center gap-2 font-semibold text-indigo-800 dark:text-indigo-200">
          <span aria-hidden>🔔</span>
          {t.promoteToProject.alertTitle}
        </p>
        <p className="mt-1 text-sm text-indigo-800 dark:text-indigo-200">
          {t.promoteToProject.alertBody.replace("{project}", parentProject.title)}
        </p>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-300">{t.promoteToProject.intro}</p>

      <div className={cardClass}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {t.promoteToProject.membersTitle}
        </h2>
        <ul className="mt-3 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {seeded.map(({ user: u, isAdmin }) => (
            <li key={u.id} className="flex items-center justify-between gap-3 bg-white p-3 dark:bg-zinc-900">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar user={toAssigneeInfo(u)!} className="h-8 w-8" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{u.email}</p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isAdmin
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {isAdmin ? t.promoteToProject.roleAdmin : t.promoteToProject.roleMember}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
        <p className="font-semibold text-amber-800 dark:text-amber-300">{t.promoteToProject.warningTitle}</p>
        <p className="mt-1 text-amber-800 dark:text-amber-200">
          {parentOpen ? t.promoteToProject.warningWorkspace : t.promoteToProject.warningRestricted}
        </p>
      </div>

      <PromoteConfirm taskId={task.id} />
    </div>
  );
}
