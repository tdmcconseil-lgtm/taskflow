"use client";

// Contexte client : rend la langue active et le dictionnaire disponibles dans
// les composants client via les hooks useI18n() / useT().
import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/fr";

type I18nValue = { locale: Locale; t: Dictionary };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Dictionary;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, t: messages }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé à l'intérieur de <I18nProvider>");
  return ctx;
}

export function useT(): Dictionary {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
