// Gardes d'accès à un espace, partagées par les actions serveur.
// Renvoient un message d'erreur localisé, ou null si l'accès est autorisé.
// (Module simple, non « use server » : importable par plusieurs fichiers d'actions.)

import { getMembership } from "@/lib/auth/dal";
import { getDictionary } from "@/lib/i18n/server";

// Seul le propriétaire (OWNER) peut effectuer l'action.
export async function ensureOwner(userId: string, workspaceId: string): Promise<string | null> {
  const membership = await getMembership(userId, workspaceId);
  if (!membership) return (await getDictionary()).errors.noWorkspaceAccess;
  if (membership.role !== "OWNER") return (await getDictionary()).errors.ownerOnly;
  return null;
}

// Administrateur = créateur (OWNER) ou administrateur (ADMIN).
export async function ensureAdmin(userId: string, workspaceId: string): Promise<string | null> {
  const membership = await getMembership(userId, workspaceId);
  if (!membership) return (await getDictionary()).errors.noWorkspaceAccess;
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    return (await getDictionary()).errors.adminOnly;
  }
  return null;
}
