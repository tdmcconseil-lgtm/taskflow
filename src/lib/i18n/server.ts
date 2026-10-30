// Côté serveur : détermine la langue active et charge le bon dictionnaire.
// La langue vient du cookie `tf_lang` ; à défaut, de l'en-tête Accept-Language
// du navigateur ; sinon de la langue par défaut.
import { cookies, headers } from "next/headers";
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/fr";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  fr: () => import("./dictionaries/fr").then((m) => m.default),
  en: () => import("./dictionaries/en").then((m) => m.default),
  es: () => import("./dictionaries/es").then((m) => m.default),
};

function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return defaultLocale;
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  return dictionaries[locale ?? (await getLocale())]();
}

// Traduit une clé d'erreur (message Zod devenu clé, ou clé directe) en message
// localisé ; repli sur « données invalides » si la clé est inconnue.
export function zodError(t: Dictionary, key: string | undefined): string {
  return (t.errors as Record<string, string>)[key ?? ""] ?? t.errors.invalidData;
}
