import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { AddMemberForm } from "@/components/AddMemberForm";
import { cardClass } from "@/components/ui";
import { getDictionary } from "@/lib/i18n/server";
import { formatPrice } from "@/lib/plans";
import { maxSeats, isPaidPlan, unitPriceCents } from "@/lib/billing/budget";

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
    select: { id: true, name: true, plan: true, budgetCapCents: true },
  });
  if (!workspace) notFound();

  const t = await getDictionary();
  // Transparence : sièges déjà réservés (membres actifs + invitations en attente),
  // plafond, et coût mensuel par membre actif.
  const [activeMembers, pendingInvites] = await Promise.all([
    prisma.membership.count({ where: { workspaceId, deactivatedAt: null } }),
    prisma.invitation.count({ where: { workspaceId, acceptedAt: null } }),
  ]);
  const paid = isPaidPlan(workspace.plan);
  const capUnset = paid && workspace.budgetCapCents === null;
  const reserved = activeMembers + pendingInvites;
  const max = maxSeats(workspace.plan, workspace.budgetCapCents);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/app/workspaces/${workspace.id}/administration`}
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          ← Membres
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Inviter un membre</h1>
      </div>

      {capUnset ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {t.errors.budgetCapUnset}
        </p>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <p>
            {t.members.seatUsage
              .replace("{used}", String(reserved))
              .replace("{max}", Number.isFinite(max) ? String(max) : t.usage.unlimited)}
          </p>
          {paid && (
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              {t.members.perMemberCost.replace("{price}", formatPrice(unitPriceCents(workspace.plan)))}
            </p>
          )}
        </div>
      )}

      <div className={cardClass}>
        <AddMemberForm workspaceId={workspace.id} />
      </div>
    </div>
  );
}
