import { cookies } from "next/headers";
import { parseStructureDepth, type StructureDepth } from "@/lib/structure-depth";

export type TaskView = "liste" | "tableau" | "arborescence" | "structure";

// Préférence d'affichage des collections de tâches (Liste / Tableau / Arborescence /
// Structure), persistée en cookie pour être conservée d'une page à l'autre.
// Par défaut : tableau.
export async function getTaskView(): Promise<TaskView> {
  const v = (await cookies()).get("tf_vue")?.value;
  return v === "liste"
    ? "liste"
    : v === "arborescence"
      ? "arborescence"
      : v === "structure"
        ? "structure"
        : "tableau";
}

// Profondeur de la vue Structure, persistée en cookie tf_niveaux (comme tf_vue).
// Par défaut : tous.
export async function getStructureDepth(): Promise<StructureDepth> {
  return parseStructureDepth((await cookies()).get("tf_niveaux")?.value);
}

export type TaskTab = "sous" | "docs" | "decisions" | "chat" | "followers" | "activite";

const TABS: TaskTab[] = ["sous", "chat", "decisions", "docs", "followers", "activite"];

// Onglet actif de la fiche de tâche, conservé d'une tâche à l'autre (cookie).
// Par défaut : sous-tâches.
export async function getTaskTab(): Promise<TaskTab> {
  const v = (await cookies()).get("tf_tab")?.value;
  return TABS.includes(v as TaskTab) ? (v as TaskTab) : "sous";
}

// Valide un onglet passé en paramètre d'URL (ex. depuis le flux d'événements),
// pour ouvrir directement le bon onglet. Renvoie undefined si absent/invalide.
export function parseTaskTab(v: string | undefined): TaskTab | undefined {
  return v && TABS.includes(v as TaskTab) ? (v as TaskTab) : undefined;
}

export type WorkspaceTab = "projets" | "membres" | "suivies" | "evenements" | "discussions";

const WS_TABS: WorkspaceTab[] = ["projets", "membres", "suivies", "evenements", "discussions"];

// Onglet actif d'un espace, conservé d'un espace à l'autre (cookie).
export async function getWorkspaceTab(): Promise<WorkspaceTab> {
  const v = (await cookies()).get("tf_ws_tab")?.value;
  return WS_TABS.includes(v as WorkspaceTab) ? (v as WorkspaceTab) : "projets";
}
