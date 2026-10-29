import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export default async function WorkspacePage({
  params,
}: PageProps<"/app/workspaces/[workspaceId]">) {
  const user = await requireUser();
  const { workspaceId } = await params;

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { tasks: true } } },
      },
      _count: { select: { members: true } },
    },
  });
  if (!workspace) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/app" className="text-sm text-zinc-500 hover:underline">
            ← Accueil
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{workspace.name}</h1>
          <Link
            href={`/app/workspaces/${workspace.id}/members`}
            className="mt-1 inline-block text-sm text-indigo-600 hover:underline"
          >
            {workspace._count.members} membre{workspace._count.members > 1 ? "s" : ""} — gérer
          </Link>
        </div>
        <Link
          href={`/app/workspaces/${workspace.id}/projects/new`}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Nouveau projet
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Projets</h2>
        {workspace.projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Aucun projet. Créez-en un pour commencer à ajouter des tâches.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspace.projects.map((p) => (
              <Link
                key={p.id}
                href={`/app/projects/${p.id}`}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
              >
                <p className="font-medium">{p.name}</p>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{p.description}</p>
                )}
                <p className="mt-3 text-xs text-zinc-400">
                  {p._count.tasks} tâche{p._count.tasks > 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
