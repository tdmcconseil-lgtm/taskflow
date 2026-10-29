import { cookies } from "next/headers";

export type TaskView = "liste" | "tableau";

// Préférence d'affichage des collections de tâches (Liste / Tableau),
// persistée en cookie pour être conservée d'une page à l'autre.
// Par défaut : tableau.
export async function getTaskView(): Promise<TaskView> {
  const v = (await cookies()).get("tf_vue")?.value;
  return v === "liste" ? "liste" : "tableau";
}

export type TaskTab = "description" | "sous" | "docs" | "chat";

const TABS: TaskTab[] = ["description", "sous", "docs", "chat"];

// Onglet actif de la fiche de tâche, conservé d'une tâche à l'autre (cookie).
// Par défaut : description.
export async function getTaskTab(): Promise<TaskTab> {
  const v = (await cookies()).get("tf_tab")?.value;
  return TABS.includes(v as TaskTab) ? (v as TaskTab) : "description";
}
