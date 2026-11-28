// Profondeur affichée par la vue Structure : un nombre de niveaux (1 = 1er niveau
// seul) ou "tous" (illimité). Module sans dépendance serveur : importable côté
// client (composant) comme côté serveur (cookie tf_niveaux).
export type StructureDepth = number | "tous";
export const STRUCTURE_DEPTH_CHOICES = [1, 2, 3, 4, 5] as const;
export const STRUCTURE_DEPTH_MAX = 20;

export function parseStructureDepth(v: string | null | undefined): StructureDepth {
  if (v && /^\d{1,2}$/.test(v)) {
    const n = Number(v);
    if (n >= 1 && n <= STRUCTURE_DEPTH_MAX) return n;
  }
  return "tous";
}
