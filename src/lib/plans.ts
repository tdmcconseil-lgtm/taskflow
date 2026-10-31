// Formules d'abonnement d'un espace et limites associées.
// Les limites sont définies ICI (en code), pas en base : changer une formule
// ne crée aucune colonne par espace, seul le champ `Workspace.plan` bascule.

export type WorkspacePlan = "FREE" | "PRO" | "BUSINESS";

export const PLANS: readonly WorkspacePlan[] = ["FREE", "PRO", "BUSINESS"] as const;

export type PlanLimits = {
  members: number;
  projects: number;
  storageMb: number;
  pendingInvites: number;
};

// Infinity = illimité (affiché comme tel, jamais comme une barre pleine).
export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  FREE: { members: 3, projects: 10, storageMb: 200, pendingInvites: 5 },
  PRO: { members: 10, projects: 50, storageMb: 2048, pendingInvites: 20 },
  BUSINESS: { members: 50, projects: 500, storageMb: 20480, pendingInvites: Infinity },
};

// Formate une taille en Mo : au-delà de 1024 Mo, on bascule en Go.
export function formatStorageMb(mb: number): string {
  if (!Number.isFinite(mb)) return "∞";
  if (mb >= 1024) {
    const go = mb / 1024;
    return `${Number.isInteger(go) ? go : go.toFixed(1)} Go`;
  }
  return `${Math.round(mb)} Mo`;
}
