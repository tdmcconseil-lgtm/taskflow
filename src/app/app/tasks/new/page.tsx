import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { canAccessTask } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { TaskForm } from "@/components/TaskForm";
import { createTask } from "@/lib/actions/tasks";
import { getDictionary } from "@/lib/i18n/server";
import { cardClass } from "@/components/ui";

export default async function NewTaskPage({
  searchParams,
}: PageProps<"/app/tasks/new">) {
  const user = await requireUser();
  const t = await getDictionary();
  const sp = await searchParams;
  const parentId = typeof sp.parent === "string" ? sp.parent : undefined;
  const workspaceParam = typeof sp.workspace === "string" ? sp.workspace : undefined;

  let workspaceId: string;
  let backHref: string;
  // Chemin (fil d'Ariane) des tâches parentes, de la racine jusqu'au parent.
  const ancestors: { id: string; title: string }[] = [];

  if (parentId) {
    const parent = await prisma.task.findUnique({
      where: { id: parentId },
      select: { id: true, title: true, workspaceId: true },
    });
    if (!parent) notFound();
    if (!(await getMembership(user.id, parent.workspaceId))) notFound();
    if (!(await canAccessTask(user.id, parent.id))) notFound();
    workspaceId = parent.workspaceId;
    backHref = `/app/tasks/${parent.id}`;

    // Remonte la chaîne des parents pour afficher le chemin complet.
    let cursor: string | null = parent.id;
    for (let i = 0; cursor && i < 50; i++) {
      const t: { id: string; title: string; parentId: string | null } | null =
        await prisma.task.findUnique({
          where: { id: cursor },
          select: { id: true, title: true, parentId: true },
        });
      if (!t) break;
      ancestors.unshift({ id: t.id, title: t.title });
      cursor = t.parentId;
    }
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
      name: true,
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

  const currentLabel = isSubtask ? t.task.newSubtask : t.task.newProject;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500 dark:text-zinc-300">
          <Link href={`/app/workspaces/${workspaceId}`} className="hover:underline">
            {workspace.name}
          </Link>
          {ancestors.map((a) => (
            <span key={a.id} className="flex items-center gap-1">
              <span className="text-zinc-300 dark:text-zinc-600">›</span>
              <Link href={`/app/tasks/${a.id}`} className="hover:underline">
                {a.title}
              </Link>
            </span>
          ))}
          <span className="text-zinc-300 dark:text-zinc-600">›</span>
          <span className="text-zinc-700 dark:text-zinc-300">{currentLabel}</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{currentLabel}</h1>
      </div>
      <div className={cardClass}>
        <TaskForm
          action={createTask}
          members={members}
          hidden={hidden}
          submitLabel={isSubtask ? t.task.createSubtask : t.task.createProject}
          cancelHref={backHref}
          showAccess={!isSubtask}
        />
      </div>
    </div>
  );
}
