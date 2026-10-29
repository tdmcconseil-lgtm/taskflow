import { prisma } from "@/lib/prisma";
import type { TaskActivityType } from "@/generated/prisma/client";

// Ajoute une entrée au journal d'activité d'une tâche (append-only).
// `groupId` regroupe les événements écrits en une seule fois ; `targetUserId`
// cible un destinataire (ex. mention) au lieu de tous les suiveurs de la tâche.
export async function logActivity(params: {
  taskId: string;
  actorId: string;
  type: TaskActivityType;
  fromValue?: string | null;
  toValue?: string | null;
  targetName?: string | null;
  groupId?: string | null;
  targetUserId?: string | null;
}): Promise<void> {
  await prisma.taskActivity.create({
    data: {
      taskId: params.taskId,
      actorId: params.actorId,
      type: params.type,
      fromValue: params.fromValue ?? null,
      toValue: params.toValue ?? null,
      targetName: params.targetName ?? null,
      groupId: params.groupId ?? null,
      targetUserId: params.targetUserId ?? null,
    },
  });
}
