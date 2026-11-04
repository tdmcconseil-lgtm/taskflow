import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

// Data Access Layer — point unique pour lire l'utilisateur courant côté serveur.
// `cache` déduplique les lectures au sein d'un même rendu.

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      photoMime: true,
      photoX: true,
      photoY: true,
      photoZoom: true,
      photoUpdatedAt: true,
      eventsReadAt: true,
    },
  });
  return user;
});

// À utiliser au début de toute page/action protégée.
export async function requireUser() {
  const user = await getCurrentUser();
  // On passe par /logout (et non /login) pour EFFACER un cookie signé encore
  // valide mais dont le compte n'existe plus : sinon le proxy optimiste
  // (signature seule) renverrait /login → /app en boucle. /logout nettoie le
  // cookie puis renvoie vers /login, où le proxy ne reboucle plus.
  if (!user) redirect("/logout");
  return user;
}

// Vérifie que l'utilisateur est membre ACTIF du workspace ; sinon null.
// Un membre désactivé n'a plus accès à l'espace.
export async function getMembership(userId: string, workspaceId: string) {
  return prisma.membership.findFirst({
    where: { userId, workspaceId, deactivatedAt: null },
  });
}
