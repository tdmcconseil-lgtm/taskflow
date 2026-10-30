import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { rootTaskId, attachDocument } from "@/lib/actions/documents";
import { formatDate } from "@/lib/labels";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export default async function AttachDocumentPage({
  params,
}: PageProps<"/app/tasks/[taskId]/documents/attach">) {
  const user = await requireUser();
  const t = await getDictionary();
  const locale = await getLocale();
  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, workspaceId: true },
  });
  if (!task) notFound();
  if (!(await getMembership(user.id, task.workspaceId))) notFound();

  const projectTaskId = await rootTaskId(task.id);
  // Documents du projet pas encore liés à cette tâche.
  const docs = await prisma.document.findMany({
    where: { projectTaskId, links: { none: { taskId: task.id } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fileName: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t.documentPage.attachTitle}</h1>
        <Link href={`/app/tasks/${task.id}`} className="text-sm text-zinc-500 dark:text-zinc-300 hover:underline">
          {t.documentPage.cancel}
        </Link>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-300">
        {t.documentPage.attachDesc.replace("{title}", task.title)}
      </p>

      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:text-zinc-300 dark:border-zinc-700">
          {t.documentPage.attachEmpty}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 bg-white p-4 dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span aria-hidden>📄</span>
                  <span className="truncate">{d.name}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-300">
                  {d.fileName} · {d.uploadedBy.name} · {formatDate(d.createdAt, locale)}
                </p>
              </div>
              <form action={attachDocument}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="documentId" value={d.id} />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  {t.documentPage.attach}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
