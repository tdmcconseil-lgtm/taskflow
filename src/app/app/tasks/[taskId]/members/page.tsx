import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getRootProject, canManageProject } from "@/lib/access";
import { UserAvatar } from "@/components/UserAvatar";
import { toAssigneeInfo, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { Button } from "@/components/Button";
import { getDictionary } from "@/lib/i18n/server";
import {
  addProjectMembers,
  setProjectMemberRole,
  removeProjectMember,
  setProjectVisibility,
  joinProjectAsAdmin,
} from "@/lib/actions/project-members";

export default async function ProjectMembersPage({
  params,
}: PageProps<"/app/tasks/[taskId]/members">) {
  const user = await requireUser();
  const t = await getDictionary();
  const { taskId } = await params;

  const root = await getRootProject(taskId);
  if (!root) notFound();
  if (!(await canManageProject(user.id, root))) notFound();

  const [project, access, members, myMembership] = await Promise.all([
    prisma.task.findUnique({
      where: { id: root.id },
      select: { id: true, title: true, visibility: true },
    }),
    prisma.projectAccess.findMany({
      where: { taskId: root.id },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { role: true, user: { select: { ...ASSIGNEE_SELECT, email: true } } },
    }),
    prisma.membership.findMany({
      where: { workspaceId: root.workspaceId, deactivatedAt: null },
      orderBy: { createdAt: "asc" },
      select: { role: true, user: { select: { ...ASSIGNEE_SELECT, email: true } } },
    }),
    prisma.membership.findFirst({
      where: { userId: user.id, workspaceId: root.workspaceId, deactivatedAt: null },
      select: { role: true },
    }),
  ]);
  if (!project) notFound();

  const open = project.visibility === "WORKSPACE";
  const adminCount = access.filter((a) => a.role === "ADMIN").length;
  const accessUserIds = new Set(access.map((a) => a.user.id));
  const isOwner = myMembership?.role === "OWNER";
  const iAmProjectAdmin = access.some((a) => a.user.id === user.id && a.role === "ADMIN");

  // Membres de l'espace pas encore sur le projet (pour le formulaire d'ajout).
  const addable = members.filter((m) => !accessUserIds.has(m.user.id));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.projectMembers.title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href={`/app/tasks/${root.id}`} className="hover:underline">
              {project.title}
            </Link>
          </p>
        </div>
        <Link
          href={`/app/tasks/${root.id}`}
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          {t.projectMembers.backToProject}
        </Link>
      </div>

      {/* Secours OWNER : si l'OWNER n'est pas encore administrateur du projet. */}
      {isOwner && !iAmProjectAdmin && (
        <form action={joinProjectAsAdmin}>
          <input type="hidden" name="taskId" value={root.id} />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
            <span className="text-amber-800 dark:text-amber-300">{t.projectMembers.ownerRescueHint}</span>
            <Button type="submit" variant="secondary">
              {t.projectMembers.ownerRescue}
            </Button>
          </div>
        </form>
      )}

      {/* Ouverture à tout l'espace */}
      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {t.projectMembers.visibilityTitle}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {open ? t.projectMembers.currentlyOpen : t.projectMembers.currentlyRestricted}
        </p>
        <form action={setProjectVisibility} className="mt-3">
          <input type="hidden" name="taskId" value={root.id} />
          <input type="hidden" name="open" value={open ? "0" : "1"} />
          <Button type="submit" variant="secondary">
            {open ? t.projectMembers.restrict : t.projectMembers.openToWorkspace}
          </Button>
        </form>
      </section>

      {/* Membres du projet */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.projectMembers.membersTitle}</h2>
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {access.map((a) => {
            const info = toAssigneeInfo(a.user)!;
            const isSelf = a.user.id === user.id;
            const isAdmin = a.role === "ADMIN";
            const isLastAdmin = isAdmin && adminCount <= 1;
            return (
              <li
                key={a.user.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 dark:bg-zinc-900"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar user={info} className="h-9 w-9" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {a.user.name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">{t.members.you}</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{a.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isAdmin
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {isAdmin ? t.projectMembers.roleAdmin : t.projectMembers.roleMember}
                  </span>

                  {/* Promouvoir / rétrograder (pas sur soi-même ni le dernier admin). */}
                  {!isSelf && !isLastAdmin && (
                    <form action={setProjectMemberRole}>
                      <input type="hidden" name="taskId" value={root.id} />
                      <input type="hidden" name="userId" value={a.user.id} />
                      <input type="hidden" name="role" value={isAdmin ? "MEMBER" : "ADMIN"} />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        {isAdmin ? t.projectMembers.demote : t.projectMembers.promote}
                      </button>
                    </form>
                  )}

                  {/* Retirer (pas soi-même ni le dernier admin). */}
                  {!isSelf && !isLastAdmin && (
                    <form action={removeProjectMember}>
                      <input type="hidden" name="taskId" value={root.id} />
                      <input type="hidden" name="userId" value={a.user.id} />
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        {t.projectMembers.remove}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Ajouter des membres */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.projectMembers.addTitle}</h2>
        {addable.length === 0 ? (
          <p className="text-sm italic text-zinc-400 dark:text-zinc-500">{t.projectMembers.addEmpty}</p>
        ) : (
          <form action={addProjectMembers} className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <input type="hidden" name="taskId" value={root.id} />
            <div className="space-y-2">
              {addable.map((m) => (
                <label key={m.user.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="members" value={m.user.id} />
                  <span>{m.user.name}</span>
                  <span className="text-zinc-400 dark:text-zinc-500">{m.user.email}</span>
                </label>
              ))}
            </div>
            <Button type="submit" variant="primary">
              {t.projectMembers.addButton}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
