import { prisma } from "@/lib/prisma";
import type { TaskActivityType } from "@/generated/prisma/client";

// Ajoute une entrée au journal d'activité d'une tâche (append-only).
export async function logActivity(params: {
  taskId: string;
  actorId: string;
  type: TaskActivityType;
  fromValue?: string | null;
  toValue?: string | null;
  targetName?: string | null;
}): Promise<void> {
  await prisma.taskActivity.create({
    data: {
      taskId: params.taskId,
      actorId: params.actorId,
      type: params.type,
      fromValue: params.fromValue ?? null,
      toValue: params.toValue ?? null,
      targetName: params.targetName ?? null,
    },
  });
}
