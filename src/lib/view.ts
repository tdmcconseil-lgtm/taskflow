import { cookies } from "next/headers";

export type TaskView = "liste" | "tableau";

// Préférence d'affichage des collections de tâches (Liste / Tableau),
// persistée en cookie pour être conservée d'une page à l'autre.
// Par défaut : tableau.
export async function getTaskView(): Promise<TaskView> {
  const v = (await cookies()).get("tf_vue")?.value;
  return v === "liste" ? "liste" : "tableau";
}

export type TaskTab = "sous" | "docs" | "decisions" | "chat" | "followers" | "activite";

const TABS: TaskTab[] = ["sous", "chat", "decisions", "docs", "followers", "activite"];

// Onglet actif de la fiche de tâche, conservé d'une tâche à l'autre (cookie).
// Par défaut : sous-tâches.
export async function getTaskTab(): Promise<TaskTab> {
  const v = (await cookies()).get("tf_tab")?.value;
  return TABS.includes(v as TaskTab) ? (v as TaskTab) : "sous";
}

export type WorkspaceTab = "projets" | "membres" | "suivies" | "evenements" | "discussions";

const WS_TABS: WorkspaceTab[] = ["projets", "membres", "suivies", "evenements", "discussions"];

// Onglet actif d'un espace, conservé d'un espace à l'autre (cookie).
export async function getWorkspaceTab(): Promise<WorkspaceTab> {
  const v = (await cookies()).get("tf_ws_tab")?.value;
  return WS_TABS.includes(v as WorkspaceTab) ? (v as WorkspaceTab) : "projets";
}
