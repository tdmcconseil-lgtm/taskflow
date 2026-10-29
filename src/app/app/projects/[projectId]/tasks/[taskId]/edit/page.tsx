import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { TaskForm } from "@/components/TaskForm";
import { updateTask } from "@/lib/actions/tasks";
import { cardClass } from "@/components/ui";

export default async function EditTaskPage({
  params,
}: PageProps<"/app/projects/[projectId]/tasks/[taskId]/edit">) {
  const user = await requireUser();
  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          workspaceId: true,
          workspace: {
            select: {
              members: {
                orderBy: { createdAt: "asc" },
                select: { user: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!task) notFound();

  const membership = await getMembership(user.id, task.project.workspaceId);
  if (!membership) notFound();

  const members = task.project.workspace.members.map((m) => m.user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/app/projects/${task.project.id}`}
          className="text-sm text-zinc-500 hover:underline"
        >
          ← {task.project.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Modifier la tâche</h1>
      </div>
      <div className={cardClass}>
        <TaskForm
          action={updateTask}
          members={members}
          hidden={{ taskId: task.id }}
          defaults={{
            title: task.title,
            description: task.description ?? undefined,
            assigneeId: task.assigneeId ?? undefined,
            priority: task.priority,
            dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : undefined,
          }}
          submitLabel="Enregistrer"
        />
      </div>
    </div>
  );
}
