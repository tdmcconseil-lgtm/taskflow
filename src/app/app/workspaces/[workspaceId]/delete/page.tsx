import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { DeleteWorkspaceForm } from "@/components/DeleteWorkspaceForm";
import { getDictionary } from "@/lib/i18n/server";

export default async function DeleteWorkspacePage({
  params,
}: PageProps<"/app/workspaces/[workspaceId]/delete">) {
  const user = await requireUser();
  const t = await getDictionary();
  const { workspaceId } = await params;

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();
  // Action destructive réservée au propriétaire.
  if (membership.role !== "OWNER") notFound();

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!workspace) notFound();

  // La suppression n'est possible qu'une fois l'espace archivé.
  if (!workspace.archivedAt) redirect(`/app/workspaces/${workspace.id}`);

  const [projects, subtasks, members, invitations] = await Promise.all([
    prisma.task.count({ where: { workspaceId, parentId: null } }),
    prisma.task.count({ where: { workspaceId, parentId: { not: null } } }),
    prisma.membership.count({ where: { workspaceId } }),
    prisma.invitation.count({ where: { workspaceId, acceptedAt: null } }),
  ]);

  const rows = [
    { label: t.deleteWorkspace.projects, value: projects },
    { label: t.deleteWorkspace.subtasks, value: subtasks },
    { label: t.deleteWorkspace.members, value: members },
    { label: t.deleteWorkspace.pendingInvitations, value: invitations },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/app/workspaces/${workspace.id}`}
          className="text-sm text-zinc-500 dark:text-zinc-300 hover:underline"
        >
          ← {workspace.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-red-700 dark:text-red-400">
          {t.deleteWorkspace.title}
        </h1>
      </div>

      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          {t.deleteWorkspace.warning.replace("{name}", workspace.name)}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          {rows.map((r) => (
            <div
              key={r.label}
              className="rounded-lg border border-red-200 bg-white p-3 text-center dark:border-red-900 dark:bg-zinc-900"
            >
              <dt className="text-xs text-zinc-500 dark:text-zinc-300">{r.label}</dt>
              <dd className="text-xl font-semibold text-red-700 dark:text-red-400">{r.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-xs text-red-700 dark:text-red-400">
          {t.deleteWorkspace.lossWarning}
        </p>
      </div>

      <DeleteWorkspaceForm workspaceId={workspace.id} workspaceName={workspace.name} />
    </div>
  );
}
