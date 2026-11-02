// Source de vérité unique des formules d'abonnement d'un espace.
// Prix, quotas et règles dérivent TOUS de PLAN_DEFS ci-dessous : la vitrine, le
// formulaire de création et les garde-fous serveur lisent cette table, jamais
// des chiffres recopiés ailleurs. Les limites vivent en code (pas en base) :
// changer une formule bascule seulement `Workspace.plan`.

export type WorkspacePlan = "FREE" | "PRO" | "BUSINESS";

export const PLANS: readonly WorkspacePlan[] = ["FREE", "PRO", "BUSINESS"] as const;

export type PlanDef = {
  // Prix mensuel par utilisateur actif, en centimes (0 = gratuit). Facturation
  // à l'usage (utilisateur-mois) : il n'y a pas de prix par siège côté Stripe.
  priceCentsPerUser: number;
  // Sièges max. Infinity sur les offres payantes : elles ne sont pas bornées par
  // la formule mais par le plafond de budget (cf. budgetCapCents).
  members: number;
  projects: number;
  // Stockage de base en Mo. storagePerUser → quota = storageMb × membres actifs ;
  // sinon forfait par espace (Free).
  storageMb: number;
  storagePerUser: boolean;
  pendingInvites: number;
  // Self-service : Free/Pro se souscrivent en ligne ; Business = « nous contacter ».
  selfServe: boolean;
  // Essai gratuit, en mois (0 = aucun). Pro = 1 mois.
  trialMonths: number;
};

export const PLAN_DEFS: Record<WorkspacePlan, PlanDef> = {
  FREE: {
    priceCentsPerUser: 0,
    members: 3,
    projects: 10,
    storageMb: 200,
    storagePerUser: false,
    pendingInvites: 5,
    selfServe: true,
    trialMonths: 0,
  },
  PRO: {
    priceCentsPerUser: 300,
    members: Infinity,
    projects: 50,
    storageMb: 5120,
    storagePerUser: true,
    pendingInvites: 20,
    selfServe: true,
    trialMonths: 1,
  },
  BUSINESS: {
    priceCentsPerUser: 600,
    members: Infinity,
    projects: 500,
    storageMb: 20480,
    storagePerUser: true,
    pendingInvites: Infinity,
    selfServe: false,
    trialMonths: 0,
  },
};

export type PlanLimits = {
  members: number;
  projects: number;
  storageMb: number;
  pendingInvites: number;
};

// Limites « plates » dérivées de PLAN_DEFS, pour le code qui lit déjà PLAN_LIMITS.
// (storageMb reste la valeur de base ; le quota effectif tient compte du
// nombre de membres via effectiveStorageMb.)
export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = Object.fromEntries(
  PLANS.map((p) => [
    p,
    {
      members: PLAN_DEFS[p].members,
      projects: PLAN_DEFS[p].projects,
      storageMb: PLAN_DEFS[p].storageMb,
      pendingInvites: PLAN_DEFS[p].pendingInvites,
    },
  ]),
) as Record<WorkspacePlan, PlanLimits>;

// Quota de stockage effectif d'un espace, en Mo : pour les offres « par
// utilisateur », la base est multipliée par le nombre de membres actifs
// (au moins 1). Forfait sinon.
export function effectiveStorageMb(plan: WorkspacePlan, activeMembers: number): number {
  const d = PLAN_DEFS[plan];
  if (!d.storagePerUser) return d.storageMb;
  return d.storageMb * Math.max(1, activeMembers);
}

// Formate une taille en Mo : au-delà de 1024 Mo, on bascule en Go.
export function formatStorageMb(mb: number): string {
  if (!Number.isFinite(mb)) return "∞";
  if (mb >= 1024) {
    const go = mb / 1024;
    return `${Number.isInteger(go) ? go : go.toFixed(1)} Go`;
  }
  return `${Math.round(mb)} Mo`;
}

// Prix mensuel par utilisateur, formaté en euros (« 0 € », « 3 € »).
export function formatPrice(cents: number): string {
  if (cents === 0) return "0 €";
  const euros = cents / 100;
  return `${Number.isInteger(euros) ? euros : euros.toFixed(2)} €`;
}
