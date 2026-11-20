// Tri des vues en liste (tâches, discussions, événements).
//
// Un seul modèle de données alimente à la fois les pages globales (/app/tasks,
// /app/discussions, /app/evenements) et les onglets d'espace correspondants.
// Pour que les deux emplacements d'un même type partagent la même logique, on
// définit ici, par type de contenu :
//   - la liste des critères de tri proposés (le premier est le défaut) ;
//   - les noms des paramètres d'URL qui mémorisent le choix.
// Les trois types ont des paramètres distincts (tsort/dsort/esort) pour coexister
// sans collision sur la page d'espace, où les trois listes partagent une URL.

import type { Prisma } from "@/generated/prisma/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

export type SortDir = "asc" | "desc";
export type SortType = "task" | "discussion" | "event";

export type SortState = { key: string; dir: SortDir };

type SortOption = { key: string; defaultDir: SortDir };

// Critères par type. Le premier élément est le tri par défaut ; `defaultDir` est
// le sens appliqué quand on sélectionne ce critère (modifiable ensuite).
const TASK_OPTIONS = [
  { key: "echeance", defaultDir: "asc" }, // défaut
  { key: "priorite", defaultDir: "desc" }, // Haute d'abord
  { key: "titre", defaultDir: "asc" },
  { key: "creation", defaultDir: "desc" },
  { key: "statut", defaultDir: "asc" },
  { key: "assigne", defaultDir: "asc" },
] as const satisfies readonly SortOption[];

const DISCUSSION_OPTIONS = [
  { key: "activite", defaultDir: "desc" }, // défaut : dernière activité
  { key: "creation", defaultDir: "desc" },
  { key: "titre", defaultDir: "asc" },
] as const satisfies readonly SortOption[];

// Les « événements » sont le flux d'activité (modèle TaskActivity) : il n'existe
// pas de date d'événement distincte ni de titre propre. On trie donc par la date
// de l'activité et, à défaut, par le titre de la tâche concernée.
const EVENT_OPTIONS = [
  { key: "date", defaultDir: "desc" }, // défaut : plus récent d'abord
  { key: "titre", defaultDir: "asc" },
] as const satisfies readonly SortOption[];

const CONFIG = {
  task: { param: "tsort", dirParam: "tdir", options: TASK_OPTIONS },
  discussion: { param: "dsort", dirParam: "ddir", options: DISCUSSION_OPTIONS },
  event: { param: "esort", dirParam: "edir", options: EVENT_OPTIONS },
} as const;

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

// Lit le critère et le sens depuis les paramètres d'URL, avec repli sur le défaut
// du type (critère inconnu → défaut ; sens absent → sens par défaut du critère).
export function parseSort(type: SortType, sp: SearchParams): SortState {
  const cfg = CONFIG[type];
  const rawKey = str(sp[cfg.param]);
  const opt = cfg.options.find((o) => o.key === rawKey) ?? cfg.options[0];
  const rawDir = str(sp[cfg.dirParam]);
  const dir: SortDir = rawDir === "asc" || rawDir === "desc" ? rawDir : opt.defaultDir;
  return { key: opt.key, dir };
}

// Props prêtes à être passées au composant client <SortControl> depuis une page
// serveur : libellés traduits, options du type, choix courant, noms de paramètres.
export function sortControlProps(type: SortType, sp: SearchParams, t: Dictionary) {
  const cfg = CONFIG[type];
  const labels = t.sort[type] as Record<string, string>;
  return {
    param: cfg.param,
    dirParam: cfg.dirParam,
    byLabel: t.sort.by,
    ascLabel: t.sort.asc,
    descLabel: t.sort.desc,
    options: cfg.options.map((o) => ({ key: o.key, label: labels[o.key], defaultDir: o.defaultDir })),
    current: parseSort(type, sp),
  };
}

// --- Tris serveur (Prisma orderBy) pour les tâches ---------------------------
// Utilisé tel quel pour la liste globale (prisma.task.findMany) et, enveloppé
// sous `task`, pour l'onglet « Mes tâches suivies » (prisma.taskFollow.findMany).

export function taskOrderBy(
  { key, dir }: SortState,
): Prisma.TaskOrderByWithRelationInput[] {
  switch (key) {
    case "priorite":
      return [{ priority: dir }, { dueDate: { sort: "asc", nulls: "last" } }];
    case "titre":
      return [{ title: dir }];
    case "creation":
      return [{ createdAt: dir }];
    case "statut":
      return [{ status: dir }, { dueDate: { sort: "asc", nulls: "last" } }];
    case "assigne":
      return [{ assignee: { name: dir } }, { createdAt: "asc" }];
    case "echeance":
    default:
      return [{ dueDate: { sort: dir, nulls: "last" } }, { createdAt: "asc" }];
  }
}

export function followTaskOrderBy(
  state: SortState,
): Prisma.TaskFollowOrderByWithRelationInput[] {
  return taskOrderBy(state).map((o) => ({ task: o }));
}
