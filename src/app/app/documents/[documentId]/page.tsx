import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/components/UserAvatar";
import { RenameDocumentForm } from "@/components/RenameDocumentForm";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { toAssigneeInfo, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { formatDateTime } from "@/lib/labels";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

export default async function DocumentPage({
  params,
}: PageProps<"/app/documents/[documentId]">) {
  const user = await requireUser();
  const { documentId } = await params;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      name: true,
      fileName: true,
      mime: true,
      size: true,
      createdAt: true,
      workspaceId: true,
      uploadedBy: { select: ASSIGNEE_SELECT },
      projectTask: { select: { id: true, title: true } },
      links: {
        orderBy: { createdAt: "asc" },
        select: { task: { select: { id: true, title: true } } },
      },
    },
  });
  if (!doc) notFound();
  if (!(await getMembership(user.id, doc.workspaceId))) notFound();

  const uploader = toAssigneeInfo(doc.uploadedBy);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
        <Link href={`/app/tasks/${doc.projectTask.id}`} className="hover:underline">
          {doc.projectTask.title}
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600">›</span>
        <span className="text-zinc-700 dark:text-zinc-300">{doc.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span aria-hidden>📄</span>
            {doc.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{doc.fileName}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/documents/${doc.id}?dl=1`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Télécharger
          </a>
          <DeleteDocumentButton documentId={doc.id} />
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">Chargé par</dt>
          <dd className="mt-1 text-sm">
            {uploader ? (
              <span className="inline-flex items-center gap-2">
                <UserAvatar user={uploader} className="h-6 w-6" />
                {doc.uploadedBy.name}
              </span>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">Date de chargement</dt>
          <dd className="mt-1 text-sm">{formatDateTime(doc.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">Taille</dt>
          <dd className="mt-1 text-sm">{formatBytes(doc.size)}</dd>
        </div>
      </dl>

      <div>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Nom simplifié
        </h2>
        <RenameDocumentForm documentId={doc.id} name={doc.name} />
      </div>

      <section className="space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">
          Actions liées{" "}
          <span className="text-sm font-normal text-zinc-400">({doc.links.length})</span>
        </h2>
        {doc.links.length === 0 ? (
          <p className="text-sm italic text-zinc-400">Ce document n'est lié à aucune tâche.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {doc.links.map((l) => (
              <li key={l.task.id} className="bg-white p-3 dark:bg-zinc-900">
                <Link
                  href={`/app/tasks/${l.task.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {l.task.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
