import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/context";
import { InlineScript } from "@/components/InlineScript";
import { UpdateBanner } from "@/components/UpdateBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "getRIDA",
  description: "Gestion de projets et de tâches en équipe.",
};

// Pose la classe `dark` sur <html> AVANT le premier rendu, pour éviter tout
// clignotement : d'après le cookie `tf_theme` s'il existe, sinon la préférence
// système. `color-scheme` est aligné pour les contrôles natifs (barres, champs).
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )tf_theme=(dark|light)/);var d=m?m[1]==='dark':matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getDictionary(locale);
  // Hash du commit servant cet onglet ; le bandeau le compare à /version pour
  // détecter un déploiement plus récent. « dev » en local ⇒ bandeau inactif.
  const buildSha = process.env.BUILD_SHA ?? "dev";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <InlineScript html={THEME_SCRIPT} />
        <I18nProvider locale={locale} messages={messages}>
          {children}
          <UpdateBanner currentSha={buildSha} />
        </I18nProvider>
      </body>
    </html>
  );
}
