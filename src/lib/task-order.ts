import { prisma } from "@/lib/prisma";

// Ordre d'affichage PERSONNEL des fratries de tâches (projets d'un espace,
// sous-tâches d'une tâche). Chaque utilisateur trie selon son propre ordre, sans
// impacter les autres (modèle TaskOrder). Les fonctions ci-dessous résolvent cet
// ordre côté lecture ; l'écriture est faite par l'action reorderTasks.

// Ordre personnel d'un utilisateur pour un ensemble de tâches : map taskId → position.
// (Le tri lui-même se fait avec applyUserOrder de task-tree, fonction pure.)
export async function getUserOrder(
  userId: string,
  taskIds: string[],
): Promise<Map<string, number>> {
  if (taskIds.length === 0) return new Map();
  const rows = await prisma.taskOrder.findMany({
    where: { userId, taskId: { in: taskIds } },
    select: { taskId: true, position: true },
  });
  return new Map(rows.map((r) => [r.taskId, r.position]));
}
