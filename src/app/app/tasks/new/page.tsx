import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { TaskForm } from "@/components/TaskForm";
import { createTask } from "@/lib/actions/tasks";
import { cardClass } from "@/components/ui";

export default async function NewTaskPage({
  searchParams,
}: PageProps<"/app/tasks/new">) {
  const user = await requireUser();
  const sp = await searchParams;
  const parentId = typeof sp.parent === "string" ? sp.parent : undefined;
  const workspaceParam = typeof sp.workspace === "string" ? sp.workspace : undefined;

  let workspaceId: string;
  let parentTitle: string | null = null;
  let backHref: string;

  if (parentId) {
    const parent = await prisma.task.findUnique({
      where: { id: parentId },
      select: { id: true, title: true, workspaceId: true },
    });
    if (!parent) notFound();
    if (!(await getMembership(user.id, parent.workspaceId))) notFound();
    workspaceId = parent.workspaceId;
    parentTitle = parent.title;
    backHref = `/app/tasks/${parent.id}`;
  } else if (workspaceParam) {
    if (!(await getMembership(user.id, workspaceParam))) notFound();
    workspaceId = workspaceParam;
    backHref = `/app/workspaces/${workspaceId}`;
  } else {
    notFound();
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      members: {
        orderBy: { createdAt: "asc" },
        select: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!workspace) notFound();

  const members = workspace.members.map((m) => m.user);
  const isSubtask = parentId !== undefined;
  const hidden: Record<string, string> = isSubtask
    ? { parentId: parentId! }
    : { workspaceId };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-zinc-500 hover:underline">
          ← Retour
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isSubtask ? "Nouvelle sous-tâche" : "Nouveau projet"}
        </h1>
        {parentTitle && (
          <p className="mt-1 text-sm text-zinc-500">
            Sous-tâche de <span className="font-medium">{parentTitle}</span>
          </p>
        )}
      </div>
      <div className={cardClass}>
        <TaskForm
          action={createTask}
          members={members}
          hidden={hidden}
          submitLabel={isSubtask ? "Créer la sous-tâche" : "Créer le projet"}
        />
      </div>
    </div>
  );
}
