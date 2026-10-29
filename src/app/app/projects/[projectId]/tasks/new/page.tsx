import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { TaskForm } from "@/components/TaskForm";
import { cardClass } from "@/components/ui";

export default async function NewTaskPage({
  params,
}: PageProps<"/app/projects/[projectId]/tasks/new">) {
  const user = await requireUser();
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        select: {
          id: true,
          members: {
            orderBy: { createdAt: "asc" },
            select: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!project) notFound();

  const membership = await getMembership(user.id, project.workspaceId);
  if (!membership) notFound();

  const members = project.workspace.members.map((m) => m.user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/app/projects/${project.id}`}
          className="text-sm text-zinc-500 hover:underline"
        >
          ← {project.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nouvelle tâche</h1>
      </div>
      <div className={cardClass}>
        <TaskForm projectId={project.id} members={members} />
      </div>
    </div>
  );
}
