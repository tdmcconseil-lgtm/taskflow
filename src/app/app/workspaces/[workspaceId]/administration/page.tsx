import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { Button, ButtonLink } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { MemberControls } from "@/components/MemberControls";
import { MembersEditSwitch } from "@/components/MembersEditSwitch";
import { AdminTabs } from "@/components/AdminTabs";
import { OrganizationProfileForm } from "@/components/OrganizationProfileForm";
import { UsagePanel } from "@/components/UsagePanel";
import { PlanPanel } from "@/components/PlanPanel";
import { BillingInfo } from "@/components/BillingInfo";
import { BillingGuide } from "@/components/BillingGuide";
import {
  unarchiveWorkspace,
  resendInvitation,
  cancelInvitation,
} from "@/lib/actions/workspaces";
import { ArchiveConfirm } from "@/components/ArchiveConfirm";
import { billableUserCount, currentMonthPeriod } from "@/lib/billing/usage";
import { unitPriceCents } from "@/lib/billing/budget";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { toAssigneeInfo, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { formatDate } from "@/lib/labels";
import { cardClass } from "@/components/ui";

// Page d'administration d'un espace : accessible aux administrateurs, signalée
// par un bandeau rouge. Onglets : Membres (gestion complète), Identité,
// Consommation, Facturation (explication du modèle à l'usage). Zone « danger »
// (archivage) en bas, réservée au propriétaire.
export default async function WorkspaceAdminPage({
  params,
  searchParams,
}: PageProps<"/app/workspaces/[workspaceId]/administration">) {
  const user = await requireUser();
  const t = await getDictionary();
  const locale = await getLocale();
  const { workspaceId } = await params;
  const sp = await searchParams;
  const sentTo = typeof sp.sent === "string" ? sp.sent : null;
  const addedTo = typeof sp.added === "string" ? sp.added : null;
  // Confirmation affichée après l'archivage (on reste dans l'espace).
  const justArchived = sp.archived === "1";
  // Changement d'offre enregistré : il sera appliqué au prochain traitement de nuit.
  const planPending = sp.planPending === "1";
  // Changement de formule bloqué faute de plafond couvrant les membres actuels.
  const planError =
    sp.planError === "budgetCapUnset" || sp.planError === "seatLimitReached"
      ? sp.planError
      : null;
  const triedPlan =
    sp.tried === "FREE" || sp.tried === "PRO" || sp.tried === "BUSINESS" ? sp.tried : null;
  // Montant saisi lors d'un changement de formule refusé, pour rouvrir le
  // formulaire sur cette valeur (l'alerte porte alors sur ce qui a été tenté).
  const triedBudgetEuros = typeof sp.triedBudget === "string" ? sp.triedBudget : null;

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();
  // Accès réservé aux administrateurs ; l'archivage reste réservé au propriétaire.
  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
  if (!isAdmin) notFound();
  const isOwner = membership.role === "OWNER";

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      plan: true,
      budgetCapCents: true,
      billingCycleStart: true,
      pendingPlan: true,
      stripeDefaultPaymentMethodId: true,
      archivedAt: true,
      organizationProfile: true,
      members: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          deactivatedAt: true,
          user: { select: { ...ASSIGNEE_SELECT, email: true } },
        },
      },
      invitations: {
        where: { acceptedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, expiresAt: true },
      },
    },
  });
  if (!workspace) notFound();

  // Métriques du volet Consommation (calculées depuis l'existant, sans table dédiée) :
  // le volet n'affiche que les membres actifs et le stockage effectif.
  // En parallèle : utilisateurs facturables du MOIS en cours (journal d'appartenance),
  // pour le coût estimé affiché dans l'onglet Facturation. Hors offre payante (FREE),
  // rien à estimer → 0.
  const month = currentMonthPeriod(workspace.billingCycleStart);
  const [storageAgg, billableUsers, pastInvoices] = await Promise.all([
    prisma.document.aggregate({ where: { workspaceId }, _sum: { size: true } }),
    month ? billableUserCount(workspaceId, month.start, month.end) : Promise.resolve(0),
    prisma.invoice.findMany({
      where: { workspaceId },
      orderBy: { periodStart: "desc" },
      select: { id: true, periodStart: true, periodEnd: true, amountCents: true, status: true, dueAt: true },
    }),
  ]);
  const usageMetrics = {
    members: workspace.members.filter((m) => m.deactivatedAt === null).length,
    storageBytes: storageAgg._sum.size ?? 0,
  };

  // Factures présentées dans l'onglet Facturation : le mois en cours (montant
  // estimé, recalculé) en tête s'il y en a un, puis les factures mensuelles
  // émises (montants figés, statut + échéance). Chaque entrée ouvre son détail.
  const invoices = [
    ...(month
      ? [
          {
            id: "current",
            isCurrent: true,
            periodStart: month.start,
            periodEnd: null as Date | null,
            amountCents: billableUsers * unitPriceCents(workspace.plan),
            billableUsers,
            status: null,
            dueAt: null as Date | null,
          },
        ]
      : []),
    ...pastInvoices.map((inv) => ({
      id: inv.id,
      isCurrent: false,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd as Date | null,
      amountCents: inv.amountCents,
      billableUsers: null,
      status: inv.status,
      dueAt: inv.dueAt as Date | null,
    })),
  ];

  const isArchived = workspace.archivedAt !== null;
  const roleLabel = (r: "OWNER" | "ADMIN" | "MEMBER") =>
    r === "MEMBER" ? t.members.roleUser : t.members.roleAdmin;

  // Liste des membres. `editing` n'affiche les contrôles (rôle, désactivation)
  // qu'en mode édition ; en lecture seule, seule l'information est visible.
  const renderMembersList = (editing: boolean) => (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {workspace.members.map((m) => {
        const deactivated = m.deactivatedAt !== null;
        const canManage = m.role !== "OWNER" && m.user.id !== user.id;
        return (
          <li
            key={m.id}
            className={`flex flex-wrap items-center justify-between gap-3 p-4 ${
              deactivated ? "bg-zinc-50 dark:bg-zinc-800/40" : "bg-white dark:bg-zinc-900"
            }`}
          >
            <div className={`flex min-w-0 items-center gap-3 ${deactivated ? "opacity-60" : ""}`}>
              <UserAvatar user={toAssigneeInfo(m.user)!} className="h-9 w-9" />
              <div className="min-w-0">
                <p className="font-medium">
                  {m.user.name}
                  {m.user.id === user.id && (
                    <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">{t.members.you}</span>
                  )}
                  {deactivated && (
                    <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-normal text-zinc-600 dark:text-zinc-300 dark:bg-zinc-700">
                      {t.members.deactivated}
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{m.user.email}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {roleLabel(m.role)}
                {m.role === "OWNER" && ` ${t.members.creator}`}
              </span>
              {editing && canManage && (
                <MemberControls
                  workspaceId={workspace.id}
                  memberUserId={m.user.id}
                  role={m.role === "ADMIN" ? "ADMIN" : "MEMBER"}
                  deactivated={deactivated}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );

  // Vue lecture seule : uniquement la liste des membres, sans contrôle.
  const membresReadOnly = renderMembersList(false);

  // Note sur les administrateurs : affichée en lecture seule (partie affichage).
  const membresNote = (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
      {t.workspace.adminEnoughAdmins}
    </div>
  );

  // Bouton d'ajout : rendu par le switch, à droite de « Retour », en édition.
  const membresInviteButton = (
    <ButtonLink href={`/app/workspaces/${workspace.id}/members/new`} variant="primary">
      {t.members.invite}
    </ButtonLink>
  );

  // Vue édition : bannières, contrôles de rôle/désactivation, invitations.
  const membresEditable = (
    <div className="space-y-6">
      {sentTo && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {t.members.invitationSent} {sentTo}.
        </p>
      )}

      {addedTo && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {t.members.memberAdded} {addedTo}.
        </p>
      )}

      {renderMembersList(true)}

      {workspace.invitations.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t.members.pendingInvitations}
          </h3>
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
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {expired ? (
                        <span className="text-red-600 dark:text-red-400">{t.members.expired}</span>
                      ) : (
                        <>
                          {t.members.pendingExpires} {formatDate(inv.expiresAt, locale)}
                        </>
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
                        {t.members.resend}
                      </button>
                    </form>
                    <form action={cancelInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:hover:bg-red-950/50"
                      >
                        {t.members.cancel}
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

  const membresPanel = (
    <MembersEditSwitch
      readOnly={membresReadOnly}
      editable={membresEditable}
      note={membresNote}
      inviteButton={membresInviteButton}
      defaultEditing={Boolean(sentTo || addedTo)}
    />
  );

  // Onglet Archivage (dernier onglet, réservé au propriétaire).
  const archivagePanel = (
    <section className={`${cardClass} space-y-4 border-red-200 dark:border-red-900`}>
      <div>
        <h2 className="text-base font-semibold text-red-800 dark:text-red-300">
          {t.workspace.archiveSectionTitle}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.workspace.archiveSectionDesc}</p>
      </div>

      {isArchived ? (
        <div className="flex flex-wrap items-center gap-2">
          <form action={unarchiveWorkspace}>
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <Button type="submit" variant="secondary">
              {t.workspace.unarchive}
            </Button>
          </form>
          <Link
            href={`/app/workspaces/${workspace.id}/delete`}
            className="rounded-lg border border-red-400 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
          >
            {t.workspace.deletePermanently}
          </Link>
        </div>
      ) : (
        <ArchiveConfirm workspaceId={workspace.id} />
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-red-900 dark:text-red-200">
            <span className="text-red-400 dark:text-red-500">{t.workspace.prefix} </span>
            {workspace.name}
          </h1>
          {/* Badge cliquable : affiche « Mode administration » au repos et, au
              survol, bascule en « Sortir » avec l'icône agrandie (retour à l'espace). */}
          <Link
            href={`/app/workspaces/${workspace.id}`}
            title={t.workspace.exitAdmin}
            aria-label={t.workspace.exitAdmin}
            className="group inline-flex items-center gap-1.5 rounded-full bg-red-100 py-1 pl-3 pr-2.5 text-xs font-medium uppercase tracking-wide text-red-700 transition hover:bg-red-200 dark:bg-red-900/60 dark:text-red-200 dark:hover:bg-red-800/60"
          >
            {/* Les deux libellés occupent la même cellule de grille : la largeur
                reste celle du plus long (« Mode administration »), donc le badge
                ne rétrécit pas au survol (pas d'oscillation). */}
            <span className="grid">
              <span className="col-start-1 row-start-1 transition-opacity group-hover:opacity-0">
                {t.workspace.adminMode}
              </span>
              <span className="col-start-1 row-start-1 opacity-0 transition-opacity group-hover:opacity-100">
                {t.workspace.exit}
              </span>
            </span>
            {/* Conteneur d'icône de taille fixe : l'icône grossit visuellement
                sans décaler la mise en page. */}
            <span className="inline-flex h-5 w-5 items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-all group-hover:h-5 group-hover:w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                />
              </svg>
            </span>
          </Link>
        </div>
      </div>

      {justArchived && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          {t.workspace.archivedConfirmation}
        </div>
      )}

      {planPending && (
        <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
          {t.billing.planChangePending}
        </div>
      )}

      <AdminTabs
        memberCount={workspace.members.length}
        formule={
          <PlanPanel
            workspaceId={workspace.id}
            plan={workspace.plan}
            pendingPlan={workspace.pendingPlan}
            budgetCapCents={workspace.budgetCapCents}
            activeMembers={usageMetrics.members}
            planError={planError}
            triedPlan={triedPlan}
            triedBudgetEuros={triedBudgetEuros}
            t={t}
          />
        }
        membres={membresPanel}
        identite={
          <OrganizationProfileForm
            workspaceId={workspace.id}
            profile={workspace.organizationProfile}
          />
        }
        consommation={<UsagePanel plan={workspace.plan} metrics={usageMetrics} t={t} />}
        facturation={
          <BillingInfo
            t={t}
            plan={workspace.plan}
            pendingPlan={workspace.pendingPlan}
            billableUsers={billableUsers}
            workspaceId={workspace.id}
            invoices={invoices}
            locale={locale}
            stripeEnabled={isStripeConfigured()}
            cardOnFile={workspace.stripeDefaultPaymentMethodId !== null}
          />
        }
        modeEmploi={<BillingGuide t={t} />}
        archivage={isOwner ? archivagePanel : undefined}
      />
    </div>
  );
}
