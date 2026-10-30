"use server";

// Change la langue de l'interface : enregistre le choix dans le cookie `tf_lang`
// puis rafraîchit le rendu (serveur) pour appliquer la nouvelle langue.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { locales, LOCALE_COOKIE } from "@/lib/i18n/config";

export async function setLocale(locale: string): Promise<void> {
  if (!(locales as readonly string[]).includes(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
