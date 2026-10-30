import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { AddMemberForm } from "@/components/AddMemberForm";
import { cardClass } from "@/components/ui";

export default async function NewMemberPage({
  params,
}: PageProps<"/app/workspaces/[workspaceId]/members/new">) {
  const user = await requireUser();
  const { workspaceId } = await params;

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();
  // Réservé aux administrateurs.
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") notFound();

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });
  if (!workspace) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/app/workspaces/${workspace.id}?tab=membres`}
          className="text-sm text-zinc-500 dark:text-zinc-300 hover:underline"
        >
          ← Membres
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Inviter un membre</h1>
      </div>
      <div className={cardClass}>
        <AddMemberForm workspaceId={workspace.id} />
      </div>
    </div>
  );
}
