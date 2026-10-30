"use server";

// Change la langue de l'interface : enregistre le choix dans le cookie `tf_lang`
// (effet immédiat) et, si l'utilisateur est connecté, dans son compte — ce qui en
// fait sa langue par défaut aux prochaines connexions, sur n'importe quel appareil.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { locales, LOCALE_COOKIE } from "@/lib/i18n/config";

export async function setLocale(locale: string): Promise<void> {
  if (!(locales as readonly string[]).includes(locale)) return;

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await getSession();
  if (session?.userId) {
    try {
      await prisma.user.update({ where: { id: session.userId }, data: { locale } });
    } catch {
      // Compte introuvable : on conserve au moins le cookie.
    }
  }

  revalidatePath("/", "layout");
}
