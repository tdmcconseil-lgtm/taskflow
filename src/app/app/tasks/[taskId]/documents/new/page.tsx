import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { UploadDocumentForm } from "@/components/UploadDocumentForm";
import { getDictionary } from "@/lib/i18n/server";
import { cardClass } from "@/components/ui";

export default async function NewDocumentPage({
  params,
}: PageProps<"/app/tasks/[taskId]/documents/new">) {
  const user = await requireUser();
  const t = await getDictionary();
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
        <h1 className="text-2xl font-semibold tracking-tight">{t.documentPage.newTitle}</h1>
        <Link href={`/app/tasks/${task.id}`} className="text-sm text-zinc-500 hover:underline">
          {t.documentPage.cancel}
        </Link>
      </div>
      <p className="text-sm text-zinc-500">
        {t.documentPage.newDesc.replace("{title}", task.title)}
      </p>
      <div className={cardClass}>
        <UploadDocumentForm taskId={task.id} />
      </div>
    </div>
  );
}
