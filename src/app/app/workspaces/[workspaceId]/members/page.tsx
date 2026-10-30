import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { cancelInvitation, resendInvitation } from "@/lib/actions/workspaces";
import { formatDate } from "@/lib/labels";

export default async function MembersPage({
  params,
  searchParams,
}: PageProps<"/app/workspaces/[workspaceId]/members">) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const sp = await searchParams;
  const sentTo = typeof sp.sent === "string" ? sp.sent : null;

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      invitations: {
        where: { acceptedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!workspace) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
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
          Inviter un membre
        </Link>
      </div>

      {sentTo && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          Un email d&apos;invitation a été renvoyé à {sentTo}.
        </p>
      )}

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

      {workspace.invitations.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Invitations en attente
          </h2>
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-dashed border-zinc-300 dark:divide-zinc-800 dark:border-zinc-700">
            {workspace.invitations.map((inv) => {
              const expired = inv.expiresAt.getTime() < Date.now();
              return (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 bg-white p-4 dark:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.email}</p>
                    <p className="text-xs text-zinc-500">
                      {expired ? (
                        <span className="text-red-600 dark:text-red-400">Expirée</span>
                      ) : (
                        <>En attente · expire le {formatDate(inv.expiresAt)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={resendInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:border-zinc-700 dark:hover:bg-indigo-950/40"
                      >
                        Renvoyer
                      </button>
                    </form>
                    <form action={cancelInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:hover:bg-red-950/50"
                      >
                        Annuler
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
