import type { TaskStatus, TaskPriority } from "@/generated/prisma/client";
import type { Locale } from "@/lib/i18n/config";

// Correspondance langue de l'app → locale Intl pour le formatage des dates.
const INTL_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-US", es: "es-ES" };

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Terminé",
};

export const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Basse",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
};

// Statut : pastille pleine (famille « état »).
export const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

// Sélecteur de statut : mêmes couleurs que la pastille, pour que le contrôle
// reflète l'état courant (et non un gris neutre).
export const STATUS_SELECT: Record<TaskStatus, string> = {
  TODO: "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  IN_PROGRESS: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  DONE: "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
};

// Priorité : famille visuellement distincte du statut — puce colorée + libellé
// sur un chip bordé (forme différente de la pastille). La puce remplace l'aplat
// rouge d'avant, ce qui désengorge le rouge sur les lignes.
export const PRIORITY_DOT: Record<TaskPriority, string> = {
  LOW: "bg-zinc-400 dark:bg-zinc-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-red-500",
};

export const PRIORITY_TEXT: Record<TaskPriority, string> = {
  LOW: "text-zinc-500 dark:text-zinc-400",
  MEDIUM: "text-amber-700 dark:text-amber-300",
  HIGH: "text-red-600 dark:text-red-400",
};

export function formatDate(
  date: Date | null | undefined,
  locale: Locale = "fr",
): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date, locale: Locale = "fr"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Titre préfixé selon la nature de la tâche : « Projet : … » (tâche racine)
// ou « Tâche : … » (sous-tâche).
export function prefixedTitle(title: string, isProject: boolean): string {
  return `${isProject ? "Projet" : "Tâche"} : ${title}`;
}

// Vrai si la date d'échéance est passée (par rapport à aujourd'hui).
export function isOverdue(date: Date | null | undefined): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}
