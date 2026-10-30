// Configuration des langues de l'interface.
export const locales = ["fr", "en", "es"] as const;
export type Locale = (typeof locales)[number];

// Langue par défaut quand rien n'est détecté.
export const defaultLocale: Locale = "fr";

// Cookie qui mémorise la langue choisie par l'utilisateur.
export const LOCALE_COOKIE = "tf_lang";

// Noms affichés dans le sélecteur de langue.
export const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};
