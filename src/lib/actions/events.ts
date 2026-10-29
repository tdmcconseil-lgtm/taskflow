"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";

// Marque la page « Événements » comme consultée (remet le compteur à zéro).
export async function markEventsRead(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { eventsReadAt: new Date() },
  });
  revalidatePath("/app", "layout");
}
