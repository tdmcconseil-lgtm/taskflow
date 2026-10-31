import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { Button, ButtonLink } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { MemberControls } from "@/components/MemberControls";
import { AdminTabs } from "@/components/AdminTabs";
import { OrganizationProfileForm } from "@/components/OrganizationProfileForm";
import { UsagePanel } from "@/components/UsagePanel";
import { PlanPanel } from "@/components/PlanPanel";
import {
  archiveWorkspace,
  unarchiveWorkspace,
  resendInvitation,
  cancelInvitation,
} from "@/lib/actions/workspaces";
import { toAssigneeInfo, ASSIGNEE_SELECT } from "@/lib/task-tree";
import { formatDate } from "@/lib/labels";
import { cardClass } from "@/components/ui";

// Page d'administration d'un espace : accessible aux administrateurs, signalée
// par un bandeau rouge. Onglets : Membres (gestion complète), Identité,
// Consommation, Facturation (à venir). Zone « danger » (archivage) en bas,
// réservée au propriétaire.
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

  // Métriques du volet Consommation (calculées depuis l'existant, sans table dédiée).
  const [projectCount, pendingInviteCount, storageAgg] = await Promise.all([
    prisma.task.count({ where: { workspaceId, parentId: null } }),
    prisma.invitation.count({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
    prisma.document.aggregate({ where: { workspaceId }, _sum: { size: true } }),
  ]);
  const usageMetrics = {
    members: workspace.members.filter((m) => m.deactivatedAt === null).length,
    projects: projectCount,
    storageBytes: storageAgg._sum.size ?? 0,
    pendingInvites: pendingInviteCount,
  };

  const isArchived = workspace.archivedAt !== null;
  const roleLabel = (r: "OWNER" | "ADMIN" | "MEMBER") =>
    r === "MEMBER" ? t.members.roleUser : t.members.roleAdmin;

  const membresPanel = (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
        {t.workspace.adminEnoughAdmins}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.members.list}</p>
        <ButtonLink href={`/app/workspaces/${workspace.id}/members/new`} variant="primary">
          {t.members.invite}
        </ButtonLink>
      </div>

      {sentTo && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {t.members.invitationSent} {sentTo}.
        </p>
      )}

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
                {canManage && (
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

  const comingSoon = (
    <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:border-zinc-700">
      {t.workspace.comingSoon}
    </p>
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
        <form action={archiveWorkspace}>
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <Button type="submit" variant="secondary">
            {t.workspace.archive}
          </Button>
        </form>
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

      <AdminTabs
        memberCount={workspace.members.length}
        formule={<PlanPanel workspaceId={workspace.id} plan={workspace.plan} t={t} />}
        membres={membresPanel}
        identite={
          <OrganizationProfileForm
            workspaceId={workspace.id}
            profile={workspace.organizationProfile}
          />
        }
        consommation={<UsagePanel plan={workspace.plan} metrics={usageMetrics} t={t} />}
        facturation={comingSoon}
        archivage={isOwner ? archivagePanel : undefined}
      />
    </div>
  );
}
