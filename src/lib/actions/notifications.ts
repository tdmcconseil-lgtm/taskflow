"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import { getDictionary } from "@/lib/i18n/server";

export type NotifFormState = { error?: string } | undefined;

const channel = z.enum(["INSTANT", "DIGEST", "OFF"]);
const prefsSchema = z.object({
  mentions: channel,
  assignments: channel,
  discussions: channel,
  taskChanges: channel,
  dueReminders: channel,
  digestFrequency: z.enum(["HOURLY", "DAILY"]),
});

// Enregistre les préférences de notification de l'utilisateur courant.
// L'interrupteur maître (case à cocher) coupe tout envoi sans toucher aux canaux
// par catégorie (on les retrouve en le réactivant).
export async function updateNotificationPreferences(
  _prev: NotifFormState,
  formData: FormData,
): Promise<NotifFormState> {
  const user = await requireUser();
  const t = await getDictionary();

  const parsed = prefsSchema.safeParse({
    mentions: formData.get("mentions"),
    assignments: formData.get("assignments"),
    discussions: formData.get("discussions"),
    taskChanges: formData.get("taskChanges"),
    dueReminders: formData.get("dueReminders"),
    digestFrequency: formData.get("digestFrequency"),
  });
  if (!parsed.success) return { error: t.errors.invalidData };

  const emailEnabled = formData.get("emailEnabled") !== null;
  const data = { emailEnabled, ...parsed.data };

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  redirect("/app/profile?notifSaved=1");
}
