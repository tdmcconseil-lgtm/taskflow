// Restriction d'accès d'un espace par domaine email : utilitaires partagés par
// les points d'application (invitation, acceptation, changement d'adresse) et
// par le formulaire d'administration. Une liste de domaines VIDE signifie
// « aucune restriction » : tout email est alors autorisé.

// Domaine d'une adresse email : la partie après le dernier « @ », en minuscules
// et sans espaces. Retourne "" si l'adresse n'a pas de domaine exploitable.
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).trim().toLowerCase();
}

// Normalise une saisie libre de domaines (séparés par virgule, point-virgule,
// espace ou retour à la ligne) : minuscules, « @ » de tête retiré, vides
// écartés, doublons supprimés, ordre de saisie conservé.
export function normalizeDomains(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@+/, ""))
    .filter((d) => d.length > 0);
  return [...new Set(parts)];
}

// Vrai si l'adresse est autorisée par la liste de domaines. Liste vide = aucune
// restriction → toujours vrai. Correspondance EXACTE du domaine (un sous-domaine
// n'est pas couvert par son domaine parent).
export function isEmailDomainAllowed(email: string, domains: string[]): boolean {
  if (domains.length === 0) return true;
  const d = emailDomain(email);
  return d !== "" && domains.includes(d);
}
