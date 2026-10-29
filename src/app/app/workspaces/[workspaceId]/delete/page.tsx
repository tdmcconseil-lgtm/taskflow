import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { DeleteWorkspaceForm } from "@/components/DeleteWorkspaceForm";

export default async function DeleteWorkspacePage({
  params,
}: PageProps<"/app/workspaces/[workspaceId]/delete">) {
  const user = await requireUser();
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

  const [projects, tasks, members, invitations] = await Promise.all([
    prisma.project.count({ where: { workspaceId } }),
    prisma.task.count({ where: { project: { workspaceId } } }),
    prisma.membership.count({ where: { workspaceId } }),
    prisma.invitation.count({ where: { workspaceId, acceptedAt: null } }),
  ]);

  const rows = [
    { label: "Projets", value: projects },
    { label: "Tâches", value: tasks },
    { label: "Membres", value: members },
    { label: "Invitations en attente", value: invitations },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/app/workspaces/${workspace.id}`}
          className="text-sm text-zinc-500 hover:underline"
        >
          ← {workspace.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-red-700 dark:text-red-400">
          Supprimer l&apos;espace
        </h1>
      </div>

      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Cette action est irréversible. La suppression de «&nbsp;{workspace.name}&nbsp;»
          entraînera la suppression définitive de tout son contenu :
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          {rows.map((r) => (
            <div
              key={r.label}
              className="rounded-lg border border-red-200 bg-white p-3 text-center dark:border-red-900 dark:bg-zinc-900"
            >
              <dt className="text-xs text-zinc-500">{r.label}</dt>
              <dd className="text-xl font-semibold text-red-700 dark:text-red-400">{r.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-xs text-red-700 dark:text-red-400">
          Toutes les tâches et tous les projets ci-dessus seront perdus, sans
          possibilité de récupération.
        </p>
      </div>

      <DeleteWorkspaceForm workspaceId={workspace.id} workspaceName={workspace.name} />
    </div>
  );
}
