import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { rootTaskId } from "@/lib/actions/documents";
import { DecisionForm } from "@/components/DecisionForm";
import { cardClass } from "@/components/ui";

export default async function NewDecisionPage({
  params,
}: PageProps<"/app/tasks/[taskId]/decisions/new">) {
  const user = await requireUser();
  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, workspaceId: true },
  });
  if (!task) notFound();
  if (!(await getMembership(user.id, task.workspaceId))) notFound();

  const projectTaskId = await rootTaskId(task.id);

  // Documents liés à la tâche (« $ ») et documents du projet (« $$ ») non déjà
  // liés à la tâche — proposés comme pièce associée à la décision.
  const [taskLinks, projectDocs] = await Promise.all([
    prisma.documentLink.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: "desc" },
      select: { document: { select: { id: true, name: true } } },
    }),
    prisma.document.findMany({
      where: { projectTaskId, links: { none: { taskId: task.id } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);
  const taskDocuments = taskLinks.map((l) => l.document);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Ajouter une décision</h1>
        <Link href={`/app/tasks/${task.id}`} className="text-sm text-zinc-500 dark:text-zinc-300 hover:underline">
          Annuler
        </Link>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-300">
        La décision sera ajoutée à « {task.title} ».
      </p>
      <div className={cardClass}>
        <DecisionForm
          taskId={task.id}
          taskDocuments={taskDocuments}
          projectDocuments={projectDocs}
        />
      </div>
    </div>
  );
}
