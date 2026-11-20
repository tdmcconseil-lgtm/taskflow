// Lecture serveur des réglages du mode découverte. Isolé du socle partagé
// (src/lib/discovery.ts) pour que ce dernier reste importable côté client sans
// embarquer Prisma dans le bundle navigateur.
import { prisma } from "@/lib/prisma";
import type { DiscoverySettings } from "@/lib/discovery";

// Lit les réglages du mode découverte d'un utilisateur. Un compte inconnu
// retombe sur les valeurs par défaut (mode actif, tour non vu, rien de masqué).
export async function getDiscoverySettings(userId: string): Promise<DiscoverySettings> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { discoveryMode: true, tourCompletedAt: true, dismissedHints: true },
  });
  return {
    enabled: row?.discoveryMode ?? true,
    tourCompleted: row?.tourCompletedAt != null,
    dismissedHints: row?.dismissedHints ?? [],
  };
}
