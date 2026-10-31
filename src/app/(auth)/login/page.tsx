import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Connexion — getRIDA" };

export default async function LoginPage() {
  const t = await getDictionary();
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight transition hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {t.common.appName}
          </Link>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.auth.loginSubtitle}</p>
        </div>
        <AuthForm mode="login" />
        <div className="mt-6 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-medium text-indigo-600 hover:underline">
            ← {t.auth.backHome}
          </Link>
          <LocaleSwitcher />
        </div>
      </div>
    </main>
  );
}
