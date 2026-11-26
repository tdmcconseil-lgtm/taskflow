import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { canManageProject } from "@/lib/access";
import { getDictionary } from "@/lib/i18n/server";
import { UserAvatar } from "@/components/UserAvatar";
import { TypeIcon } from "@/components/TypeIcon";
import { toAssigneeInfo } from "@/lib/task-tree";
import { cardClass } from "@/components/ui";
import { computeAttachImpact, type ImpactUser } from "@/lib/attach-impact";
import { AttachConfirm } from "@/components/AttachConfirm";

type ProjectRow = {
  id: string;
  title: string;
  workspaceId: string;
  parentId: string | null;
  createdById: string;
  visibility: "WORKSPACE" | "RESTRICTED";
};

// Rattachement d'un projet racine P SOUS un autre projet racine Q (démotion de P
// en sous-tâche). Une seule route pour les deux étapes :
//  - sans ?target : sélecteur des projets d'accueil éligibles ;
//  - avec ?target=<Qid> valide : écran de confirmation (impact d'accès calculé
//    côté serveur : blocages nominatifs, exposition inverse, notice WORKSPACE).
export default async function AttachProjectPage({
  params,
  searchParams,
}: PageProps<"/app/tasks/[taskId]/attach">) {
  const user = await requireUser();
  const t = await getDictionary();
  const a = t.attachToProject;
  const { taskId } = await params;
  const sp = await searchParams;
  const targetParam = typeof sp.target === "string" ? sp.target : undefined;

  // --- Projet source P : doit être une tâche racine, gérée par l'opérateur. ---
  const source = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      workspaceId: true,
      parentId: true,
      createdById: true,
      visibility: true,
    },
  });
  if (!source) notFound();
  if (!(await getMembership(user.id, source.workspaceId))) notFound();
  if (source.parentId !== null) notFound(); // pas un projet
  if (!(await canManageProject(user.id, source))) notFound();

  // Projets d'accueil éligibles : racines du même espace que l'opérateur
  // administre, hors P lui-même.
  const roots: ProjectRow[] = await prisma.task.findMany({
    where: { workspaceId: source.workspaceId, parentId: null, id: { not: source.id } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      workspaceId: true,
      parentId: true,
      createdById: true,
      visibility: true,
    },
  });
  const eligible: ProjectRow[] = [];
  for (const r of roots) {
    if (await canManageProject(user.id, r)) eligible.push(r);
  }

  const target = targetParam ? eligible.find((r) => r.id === targetParam) ?? null : null;

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{a.title}</h1>
      <Link
        href={`/app/tasks/${source.id}`}
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        {a.backToProject}
      </Link>
    </div>
  );

  const sourceLine = (
    <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <TypeIcon isProject label={t.task.prefixProject} />
      <span className="font-medium">« {source.title} »</span>
    </p>
  );

  // ---------- Étape 1 : sélecteur du projet d'accueil ----------
  if (!target) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {header}
        {sourceLine}
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {a.pickIntro.replace("{project}", source.title)}
        </p>

        {eligible.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center text-sm italic text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
            {a.pickEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {eligible.map((r) => (
              <li key={r.id} className="bg-white dark:bg-zinc-900">
                <Link
                  href={`/app/tasks/${source.id}/attach?target=${r.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <TypeIcon isProject label={t.task.prefixProject} />
                    <span className="truncate font-medium">{r.title}</span>
                  </span>
                  <span className="shrink-0 text-sm text-indigo-600 dark:text-indigo-400">
                    {a.pickSelect} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ---------- Étape 2 : confirmation (impact d'accès) ----------
  const impact = await computeAttachImpact(source, target);
  const blocked = impact.blockers.length > 0;

  const renderUser = (u: ImpactUser, reason?: string) => (
    <li
      key={u.id}
      className="flex items-center justify-between gap-3 bg-white p-3 dark:bg-zinc-900"
    >
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar user={toAssigneeInfo(u)!} className="h-8 w-8" />
        <div className="min-w-0">
          <p className="truncate font-medium">{u.name}</p>
          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{u.email}</p>
        </div>
      </div>
      {reason && (
        <span className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400">
          {reason}
        </span>
      )}
    </li>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {header}
      {sourceLine}

      {/* Projet d'accueil choisi */}
      <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          {a.targetLabel}
        </p>
        <p className="mt-1 flex items-center gap-2 font-semibold text-indigo-800 dark:text-indigo-200">
          <TypeIcon isProject label={t.task.prefixProject} />
          « {target.title} »
        </p>
        <p className="mt-2 text-sm text-indigo-800 dark:text-indigo-200">
          {a.intro.replace("{source}", source.title).replace("{target}", target.title)}
        </p>
        <Link
          href={`/app/tasks/${source.id}/attach`}
          className="mt-2 inline-block text-sm text-indigo-700 underline hover:no-underline dark:text-indigo-300"
        >
          {a.changeTarget}
        </Link>
      </div>

      {/* Notice renforcée : P était ouvert à tout l'espace. */}
      {impact.sourceWasWorkspace && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-800 dark:text-amber-300">{a.workspaceNoticeTitle}</p>
          <p className="mt-1 text-amber-800 dark:text-amber-200">
            {a.workspaceNoticeBody
              .replace("{source}", source.title)
              .replace("{target}", target.title)}
          </p>
        </div>
      )}

      {/* BLOCAGE DUR : ayants-droit de P sans accès à Q. */}
      {blocked && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/40">
          <p className="font-semibold text-red-800 dark:text-red-300">{a.blockersTitle}</p>
          <p className="mt-1 text-sm text-red-800 dark:text-red-200">
            {a.blockersBody.replace("{source}", source.title).replace("{target}", target.title)}
          </p>
          <ul className="mt-3 divide-y divide-red-200 overflow-hidden rounded-xl border border-red-200 dark:divide-red-900 dark:border-red-900">
            {impact.blockers.map((u) =>
              renderUser(u, a.blockerReason.replace("{target}", target.title)),
            )}
          </ul>
        </div>
      )}

      {/* Exposition inverse (non bloquante) : l'équipe de Q va découvrir P. */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
        <p className="font-semibold text-amber-800 dark:text-amber-300">{a.exposureTitle}</p>
        {impact.exposed.length === 0 ? (
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{a.exposureEmpty}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              {a.exposureBody.replace("{source}", source.title).replace("{target}", target.title)}
            </p>
            <ul className="mt-3 divide-y divide-amber-200 overflow-hidden rounded-xl border border-amber-200 dark:divide-amber-900 dark:border-amber-900">
              {impact.exposed.map((u) => renderUser(u))}
            </ul>
          </>
        )}
      </div>

      <div className={cardClass}>
        <AttachConfirm projectId={source.id} targetId={target.id} disabled={blocked} />
      </div>
    </div>
  );
}
