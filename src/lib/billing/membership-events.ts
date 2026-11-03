// Journal d'appartenance (facturation à l'usage « utilisateur-mois »).
// On consigne chaque activation (ajout / invitation acceptée / réactivation) et
// chaque désactivation d'un membre, horodatée. Append-only : ce journal est la
// source de vérité pour reconstituer les périodes d'activité d'un membre, alors
// que `Membership.deactivatedAt` ne porte que l'état courant.
//
// Pour les mutations déjà faites dans une transaction (upsert + suppression
// d'invitation, création conditionnelle…), on insère plutôt
// `prisma.membershipEvent.create(...)` directement dans le tableau de la
// transaction, pour garder l'écriture atomique avec le changement d'état.

import { prisma } from "@/lib/prisma";

export type MembershipEventType = "ACTIVATED" | "DEACTIVATED";

// Écrit un événement du journal (hors transaction). `at` vaut l'instant courant.
export async function logMembershipEvent(
  workspaceId: string,
  userId: string,
  type: MembershipEventType,
): Promise<void> {
  await prisma.membershipEvent.create({ data: { workspaceId, userId, type } });
}
