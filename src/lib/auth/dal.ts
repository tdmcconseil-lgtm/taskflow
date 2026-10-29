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
    select: { id: true, name: true, email: true },
  });
  return user;
});

// À utiliser au début de toute page/action protégée.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Workspaces auxquels appartient l'utilisateur (avec son rôle).
export async function getUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
      _count: { select: { projects: true } },
    },
  });
}

// Vérifie que l'utilisateur est membre du workspace ; sinon 404-like (null).
export async function getMembership(userId: string, workspaceId: string) {
  return prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}
