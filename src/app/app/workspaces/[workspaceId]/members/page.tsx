import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export default async function MembersPage({
  params,
}: PageProps<"/app/workspaces/[workspaceId]/members">) {
  const user = await requireUser();
  const { workspaceId } = await params;

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!workspace) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/app/workspaces/${workspace.id}`}
            className="text-sm text-zinc-500 hover:underline"
          >
            ← {workspace.name}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Membres</h1>
        </div>
        <Link
          href={`/app/workspaces/${workspace.id}/members/new`}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Ajouter un membre
        </Link>
      </div>

      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {workspace.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between bg-white p-4 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium">
                {m.user.name}
                {m.user.id === user.id && (
                  <span className="ml-2 text-xs text-zinc-400">(vous)</span>
                )}
              </p>
              <p className="text-sm text-zinc-500">{m.user.email}</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {m.role === "OWNER" ? "Propriétaire" : "Membre"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
