import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import type { TaskStatus, TaskPriority, TaskActivityType } from "@/generated/prisma/client";

export type ActivityCore = {
  type: TaskActivityType;
  fromValue: string | null;
  toValue: string | null;
  targetName: string | null;
};

// Phrase décrivant un événement unique (sans le nom de l'auteur).
export function describeActivity(a: ActivityCore): string {
  switch (a.type) {
    case "CREATED":
      return "a créé cette tâche";
    case "STATUS_CHANGED":
      return `a changé le statut : ${STATUS_LABELS[a.fromValue as TaskStatus]} → ${STATUS_LABELS[a.toValue as TaskStatus]}`;
    case "PRIORITY_CHANGED":
      return `a changé la priorité : ${PRIORITY_LABELS[a.fromValue as TaskPriority]} → ${PRIORITY_LABELS[a.toValue as TaskPriority]}`;
    case "DUE_DATE_CHANGED":
      if (!a.fromValue && a.toValue) return `a défini l'échéance au ${a.toValue}`;
      if (a.fromValue && !a.toValue) return "a retiré l'échéance";
      return `a modifié l'échéance : ${a.fromValue} → ${a.toValue}`;
    case "ASSIGNED":
      if (!a.targetName) return "a retiré l'assignation";
      if (a.fromValue) return `a réassigné de ${a.fromValue} à ${a.targetName}`;
      return `a assigné à ${a.targetName}`;
    case "TITLE_CHANGED":
      return `a renommé : « ${a.fromValue} » → « ${a.toValue} »`;
    case "DESCRIPTION_CHANGED":
      return "a modifié la description";
    case "SUBTASK_ADDED":
      return `a ajouté la sous-tâche « ${a.targetName} »`;
    case "SUBTASK_REMOVED":
      return `a supprimé la sous-tâche « ${a.targetName} »`;
    case "COMMENT_ADDED":
      return "a écrit un message dans la discussion";
    case "MENTIONED":
      return `a mentionné ${a.targetName ?? "quelqu'un"} dans la discussion`;
    default:
      return "a modifié la tâche";
  }
}

// Mot court pour le résumé d'une sauvegarde multi-champs regroupée.
export const ASPECT_LABELS: Partial<Record<TaskActivityType, string>> = {
  STATUS_CHANGED: "statut",
  PRIORITY_CHANGED: "priorité",
  DUE_DATE_CHANGED: "échéance",
  ASSIGNED: "assignation",
  TITLE_CHANGED: "titre",
  DESCRIPTION_CHANGED: "description",
  SUBTASK_ADDED: "sous-tâche ajoutée",
  SUBTASK_REMOVED: "sous-tâche supprimée",
};

// Joint une liste avec des virgules et « et » avant le dernier élément.
export function joinFr(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return parts.slice(0, -1).join(", ") + " et " + parts[parts.length - 1];
}
