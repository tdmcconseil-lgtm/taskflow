"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PriorityBadge } from "@/components/badges";
import { TypeIcon } from "@/components/TypeIcon";
import { UserAvatar } from "@/components/UserAvatar";
import { reorderTasks, reparentTask } from "@/lib/actions/tasks";
import { useT } from "@/lib/i18n/context";
import type { SubtaskItem } from "@/components/ReorderableSubtasks";

// Portée du mode « édition de la hiérarchie » pour une fratrie donnée.
//  - parentId null  : projets racine de l'espace (réordonnables seulement) ;
//  - parentId string : sous-tâches d'une tâche (réordonner + remonter + rattacher).
// grandParentId = cible du « remonter d'un niveau » (#2), null si impossible
// (fratrie de 1er niveau, dont la mère est un projet racine).
export type HierarchyScope = {
  parentId: string | null;
  parentTitle: string;
  grandParentId: string | null;
  grandParentTitle: string | null;
};

type ConfirmState = { item: SubtaskItem; newParentId: string; targetTitle: string } | null;

// Liste éditable d'une fratrie : glisser-déposer + flèches ↑/↓ (déplacement #1,
// sans friction), et boutons explicites « remonter » (#2) / « rattacher sous… »
// (#3) ouvrant une modale de confirmation. Tous les mouvements restent
// intra-projet : la frontière projet/tâche est gelée côté serveur.
export function HierarchyEditor({
  scope,
  workspaceId,
  items,
  canPromoteToProject = false,
  manageableProjectIds,
}: {
  scope: HierarchyScope;
  workspaceId: string;
  items: SubtaskItem[];
  // Sur une fratrie de 1er niveau (mère = projet racine), « Monter » ne peut
  // pas être un #2 intra-projet : il TRANSFORME la tâche en projet autonome.
  // Ce drapeau (admin du projet source / OWNER) autorise cette promotion ;
  // sinon le bouton reste indisponible, comme avant.
  canPromoteToProject?: boolean;
  // Sur une liste de PROJETS racine (espace) : identifiants des projets que
  // l'utilisateur administre. Un bouton « Rattacher à un projet… » (symétrique
  // du « ↰ Monter » de la promotion) les mène vers l'écran dédié /attach ;
  // affiché seulement pour ces projets (backstop = action serveur gardée).
  manageableProjectIds?: string[];
}) {
  const dict = useT();
  const h = dict.hierarchy;
  const router = useRouter();
  const { parentId, parentTitle, grandParentId, grandParentTitle } = scope;

  const isProjectList = parentId === null;
  // Projets (racine) que l'utilisateur administre : seuls ceux-là reçoivent
  // l'entrée « Rattacher à un projet… » dans l'éditeur de hiérarchie de l'espace.
  const manageableSet = new Set(manageableProjectIds ?? []);
  // « Monter » sur une tâche de 1er niveau (sa mère est un projet racine, donc
  // grandParentId null) = PROMOTION en projet, écran de confirmation dédié
  // /promote (alerte « vous créez un nouveau projet »). Pour une tâche plus
  // profonde, c'est le #2 intra-projet classique (modale reparentTask).
  const isPromotionCase = !isProjectList && grandParentId === null;
  const canReparentUp = grandParentId !== null; // #2 possible (la mère n'est pas un projet)
  const canAttach = !isProjectList; // #3 possible (les éléments ne sont pas des projets)

  const [order, setOrder] = useState<SubtaskItem[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pickAttachId, setPickAttachId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const orderRef = useRef<string[]>(items.map((i) => i.id));

  // Resynchronise si la composition de la liste change (déplacement validé,
  // ajout, suppression) après revalidation serveur.
  const membership = items.map((i) => i.id).slice().sort().join(",");
  useEffect(() => {
    setOrder(items);
    orderRef.current = items.map((i) => i.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership]);

  useEffect(() => {
    orderRef.current = order.map((i) => i.id);
  }, [order]);

  function commitOrder() {
    reorderTasks(parentId, orderRef.current, workspaceId);
  }

  function onEnter(overId: string) {
    if (!dragId || dragId === overId) return;
    setOrder((prev) => {
      const from = prev.findIndex((x) => x.id === dragId);
      const to = prev.findIndex((x) => x.id === overId);
      if (from < 0 || to < 0) return prev;
      const copy = prev.slice();
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  function onDrop() {
    if (dragId) commitOrder();
    setDragId(null);
  }

  function runReparent() {
    if (!confirm) return;
    setError(null);
    const { item, newParentId } = confirm;
    startTransition(async () => {
      const res = await reparentTask(item.id, newParentId);
      if ("error" in res) {
        setError(res.error);
      } else {
        setConfirm(null);
      }
    });
  }

  return (
    <>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {order.map((t) => {
          const done = t.status === "DONE";
          const siblings = order.filter((s) => s.id !== t.id);
          return (
            <li
              key={t.id}
              onDragEnter={() => onEnter(t.id)}
              onDragOver={(e) => e.preventDefault()}
              className={`flex items-center gap-2 p-3 ${
                done ? "bg-zinc-50 dark:bg-zinc-800/40" : "bg-white dark:bg-zinc-900"
              } ${dragId === t.id ? "opacity-40" : ""}`}
            >
              <span
                draggable
                onDragStart={() => setDragId(t.id)}
                onDragEnd={onDrop}
                title={dict.task.dragToReorder}
                className="shrink-0 cursor-grab select-none px-1 text-zinc-300 active:cursor-grabbing dark:text-zinc-600"
              >
                ⠿
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <TypeIcon
                    isProject={isProjectList}
                    label={isProjectList ? dict.task.prefixProject : dict.task.prefixTask}
                  />
                  <Link
                    href={`/app/tasks/${t.id}`}
                    draggable={false}
                    className={`truncate font-medium hover:underline ${done ? "text-zinc-400 dark:text-zinc-600" : ""}`}
                  >
                    {t.title}
                  </Link>
                  {t.childCount > 0 && (
                    <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                      {t.childCount}{" "}
                      {t.childCount > 1 ? dict.task.subtasksWord : dict.task.subtaskWord}
                    </span>
                  )}
                </div>
                {t.assignee && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <UserAvatar user={t.assignee} className="h-4 w-4" />
                    {t.assignee.name}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <PriorityBadge priority={t.priority} />
                {/* Projet racine administré : entrée vers le rattachement sous un
                    autre projet (écran dédié /attach, sélecteur + confirmation).
                    Pendant du « ↰ Monter » de la promotion. */}
                {isProjectList && manageableSet.has(t.id) && (
                  <button
                    type="button"
                    onClick={() => router.push(`/app/tasks/${t.id}/attach`)}
                    title={dict.task.attachToProject}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    ↳ {h.attachToProjectShort}
                  </button>
                )}
                {!isProjectList && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (isPromotionCase) {
                          // Promotion en projet : on envoie vers l'écran de
                          // confirmation /promote (alerte + membres amorcés),
                          // pas de reparent silencieux. Garde côté serveur aussi.
                          if (canPromoteToProject) router.push(`/app/tasks/${t.id}/promote`);
                          return;
                        }
                        if (grandParentId)
                          setConfirm({
                            item: t,
                            newParentId: grandParentId,
                            targetTitle: grandParentTitle ?? "",
                          });
                      }}
                      disabled={isPromotionCase ? !canPromoteToProject : !canReparentUp}
                      title={
                        isPromotionCase
                          ? canPromoteToProject
                            ? h.promoteToProjectTitle
                            : h.promoteToProjectAdminOnly
                          : h.promote
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      ↰ {h.promoteShort}
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPickAttachId(pickAttachId === t.id ? null : t.id)}
                        disabled={!canAttach || siblings.length === 0}
                        title={
                          siblings.length === 0 ? h.attachNoSibling : h.attach
                        }
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        ↳ {h.attachShort}
                      </button>
                      {pickAttachId === t.id && siblings.length > 0 && (
                        <div className="absolute right-0 top-full z-20 mt-1 max-h-64 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                          <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            {h.attachPickSibling}
                          </p>
                          {siblings.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setPickAttachId(null);
                                setConfirm({ item: t, newParentId: s.id, targetTitle: s.title });
                              }}
                              className="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              {s.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !pending && setConfirm(null)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">{h.confirmTitle}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              <span className="font-medium">« {confirm.item.title} »</span>
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/60">
              <span className="text-zinc-500 dark:text-zinc-400">{parentTitle}</span>
              <span className="text-zinc-400 dark:text-zinc-500">→</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-100">
                {confirm.targetTitle}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{h.subtreeFollows}</p>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={pending}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {dict.task.cancel}
              </button>
              <button
                type="button"
                onClick={runReparent}
                disabled={pending}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {pending ? h.moving : h.confirmMove}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
