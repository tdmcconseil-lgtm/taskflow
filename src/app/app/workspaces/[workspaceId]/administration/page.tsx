import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/Button";
import { archiveWorkspace, unarchiveWorkspace } from "@/lib/actions/workspaces";
import { cardClass } from "@/components/ui";

// Page d'administration d'un espace. Pour l'instant : archivage (archiver /
// désarchiver / supprimer définitivement). D'autres réglages viendront.
export default async function WorkspaceAdminPage({
  params,
}: PageProps<"/app/workspaces/[workspaceId]/administration">) {
  const user = await requireUser();
  const t = await getDictionary();
  const { workspaceId } = await params;

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();
  // Administration de l'espace réservée au propriétaire.
  if (membership.role !== "OWNER") notFound();

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!workspace) notFound();

  const isArchived = workspace.archivedAt !== null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/app/workspaces/${workspace.id}`}
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          ← {workspace.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.workspace.administration}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.workspace.administrationDesc}</p>
      </div>

      <section className={`${cardClass} space-y-4`}>
        <div>
          <h2 className="text-base font-semibold">{t.workspace.archiveSectionTitle}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.workspace.archiveSectionDesc}</p>
        </div>

        {isArchived ? (
          <div className="flex flex-wrap items-center gap-2">
            <form action={unarchiveWorkspace}>
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <Button type="submit" variant="secondary">
                {t.workspace.unarchive}
              </Button>
            </form>
            <Link
              href={`/app/workspaces/${workspace.id}/delete`}
              className="rounded-lg border border-red-400 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              {t.workspace.deletePermanently}
            </Link>
          </div>
        ) : (
          <form action={archiveWorkspace}>
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <Button type="submit" variant="secondary">
              {t.workspace.archive}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
