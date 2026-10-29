import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { UploadDocumentForm } from "@/components/UploadDocumentForm";
import { cardClass } from "@/components/ui";

export default async function NewDocumentPage({
  params,
}: PageProps<"/app/tasks/[taskId]/documents/new">) {
  const user = await requireUser();
  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, workspaceId: true },
  });
  if (!task) notFound();
  if (!(await getMembership(user.id, task.workspaceId))) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Téléverser un document</h1>
        <Link href={`/app/tasks/${task.id}`} className="text-sm text-zinc-500 hover:underline">
          Annuler
        </Link>
      </div>
      <p className="text-sm text-zinc-500">
        Le document sera ajouté aux documents du projet et lié à « {task.title} ».
      </p>
      <div className={cardClass}>
        <UploadDocumentForm taskId={task.id} />
      </div>
    </div>
  );
}
