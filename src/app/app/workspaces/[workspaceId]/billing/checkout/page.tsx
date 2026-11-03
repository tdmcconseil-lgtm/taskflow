import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { cardClass } from "@/components/ui";
import { formatPrice, type WorkspacePlan } from "@/lib/plans";
import { isPaidPlan, unitPriceCents } from "@/lib/billing/budget";
import { resolveSimulatedCheckout } from "@/lib/actions/admin";

// Étape de paiement SIMULÉE de la souscription à une offre payante. Aucun
// Stripe, aucune marque, aucun champ carte, aucun débit : c'est un stub de
// développement. On y arrive depuis le changement de formule (setPlanAndBudget)
// quand un espace passe d'une offre gratuite à une offre payante. Les deux
// boutons résolvent le « paiement » (réussi / échoué) via resolveSimulatedCheckout.
export default async function BillingCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const sp = await searchParams;
  const t = await getDictionary();
  const c = t.checkout;

  const planParam = typeof sp.plan === "string" ? sp.plan : "";
  const plan = (planParam === "PRO" || planParam === "BUSINESS" ? planParam : null) as
    | WorkspacePlan
    | null;
  const budgetEuros = typeof sp.budget === "string" ? sp.budget : "";

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();
  // Réservé aux administrateurs, et à une offre payante (sinon rien à payer).
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") notFound();
  if (!plan || !isPaidPlan(plan)) notFound();

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  if (!workspace) notFound();

  const activeMembers = await prisma.membership.count({
    where: { workspaceId, deactivatedAt: null },
  });
  const monthly = formatPrice(activeMembers * unitPriceCents(plan));

  const adminHref = `/app/workspaces/${workspaceId}/administration`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Bandeau de simulation, bien visible : ce n'est pas un vrai paiement. */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        {c.simulationBadge}
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{c.intro}</p>
      </div>

      <section className={`${cardClass} space-y-3`}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {c.recapPlanLabel}
          </span>
          <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {plan}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {c.recapAmountLabel}
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {c.recapAmountValue
              .replace("{amount}", monthly)
              .replace("{n}", String(activeMembers))}
          </span>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {/* Paiement réussi (simulé) : applique la formule. */}
        <form action={resolveSimulatedCheckout}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="plan" value={plan} />
          <input type="hidden" name="budgetEuros" value={budgetEuros} />
          <input type="hidden" name="outcome" value="success" />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950"
          >
            {c.payButton}
          </button>
        </form>

        {/* Échec (simulé) : rien n'est appliqué. */}
        <form action={resolveSimulatedCheckout}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="plan" value={plan} />
          <input type="hidden" name="budgetEuros" value={budgetEuros} />
          <input type="hidden" name="outcome" value="fail" />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {c.failButton}
          </button>
        </form>

        <Link
          href={adminHref}
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          {c.cancel}
        </Link>
      </div>
    </div>
  );
}
