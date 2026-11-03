// Rôle superadmin applicatif (niveau plateforme, distinct des rôles d'espace
// OWNER/ADMIN/MEMBER). PRÉPARÉ POUR L'AVENIR : aucune UI ne l'utilise encore en
// v1 — le recouvrement (constatation du paiement + réouverture) se fait via
// scripts/recouvrement.ts, lancé par le superadmin avec un accès direct à la base.
//
// Deux sources, pour pouvoir octroyer le rôle sans toucher la base (bootstrap) :
//   - le drapeau User.isSuperAdmin ;
//   - l'allowlist d'emails SUPERADMIN_EMAILS (séparés par des virgules).

// Emails autorisés par la variable d'environnement (insensible à la casse).
export function superAdminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Un utilisateur est-il superadmin applicatif ?
export function isSuperAdmin(user: { email: string; isSuperAdmin?: boolean }): boolean {
  return Boolean(user.isSuperAdmin) || superAdminEmails().includes(user.email.toLowerCase());
}
