import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import type { TaskStatus, TaskPriority, TaskActivityType } from "@/generated/prisma/client";

export type ActivityCore = {
  type: TaskActivityType;
  fromValue: string | null;
  toValue: string | null;
  targetName: string | null;
};

// Phrase décrivant un événement unique (sans le nom de l'auteur), traduite.
export function describeActivity(a: ActivityCore, t: Dictionary): string {
  const act = t.activity;
  switch (a.type) {
    case "CREATED":
      return act.created;
    case "STATUS_CHANGED":
      return `${act.statusChanged} ${t.status[a.fromValue as TaskStatus]} → ${t.status[a.toValue as TaskStatus]}`;
    case "PRIORITY_CHANGED":
      return `${act.priorityChanged} ${t.priority[a.fromValue as TaskPriority]} → ${t.priority[a.toValue as TaskPriority]}`;
    case "DUE_DATE_CHANGED":
      if (!a.fromValue && a.toValue) return act.dueSet.replace("{date}", a.toValue);
      if (a.fromValue && !a.toValue) return act.dueRemoved;
      return act.dueChanged.replace("{from}", a.fromValue ?? "").replace("{to}", a.toValue ?? "");
    case "ASSIGNED":
      if (!a.targetName) return act.unassigned;
      if (a.fromValue)
        return act.reassigned.replace("{from}", a.fromValue).replace("{to}", a.targetName);
      return act.assigned.replace("{name}", a.targetName);
    case "TITLE_CHANGED":
      return act.renamed.replace("{from}", a.fromValue ?? "").replace("{to}", a.toValue ?? "");
    case "DESCRIPTION_CHANGED":
      return act.descriptionChanged;
    case "SUBTASK_ADDED":
      return act.subtaskAdded.replace("{name}", a.targetName ?? "");
    case "SUBTASK_REMOVED":
      return act.subtaskRemoved.replace("{name}", a.targetName ?? "");
    case "COMMENT_ADDED":
      return act.commentAdded;
    case "MENTIONED":
      return act.mentioned.replace("{name}", a.targetName ?? act.someone);
    default:
      return act.modified;
  }
}

// Mot court pour le résumé d'une sauvegarde multi-champs regroupée (traduit).
export function aspectLabel(type: TaskActivityType, t: Dictionary): string | undefined {
  const map: Partial<Record<TaskActivityType, string>> = {
    STATUS_CHANGED: t.activity.aspectStatus,
    PRIORITY_CHANGED: t.activity.aspectPriority,
    DUE_DATE_CHANGED: t.activity.aspectDueDate,
    ASSIGNED: t.activity.aspectAssigned,
    TITLE_CHANGED: t.activity.aspectTitle,
    DESCRIPTION_CHANGED: t.activity.aspectDescription,
    SUBTASK_ADDED: t.activity.aspectSubtaskAdded,
    SUBTASK_REMOVED: t.activity.aspectSubtaskRemoved,
  };
  return map[type];
}

// Joint une liste avec des virgules et le mot « et » (traduit) avant le dernier.
export function joinWithAnd(parts: string[], and: string): string {
  if (parts.length <= 1) return parts.join("");
  return parts.slice(0, -1).join(", ") + " " + and + " " + parts[parts.length - 1];
}
