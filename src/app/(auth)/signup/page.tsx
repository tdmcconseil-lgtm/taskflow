import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Inscription — Taskflow" };

export default async function SignupPage() {
  const t = await getDictionary();
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t.common.appName}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t.auth.signupSubtitle}</p>
        </div>
        <AuthForm mode="signup" />
        <div className="mt-6 flex justify-center">
          <LocaleSwitcher />
        </div>
      </div>
    </main>
  );
}
