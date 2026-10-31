import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Mot de passe oublié — getRIDA" };

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<"/forgot-password">) {
  const t = await getDictionary();
  const sp = await searchParams;
  const sent = sp.sent === "1";

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t.forgotPassword.title}</h1>
          {!sent && (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t.forgotPassword.desc}</p>
          )}
        </div>

        {sent ? (
          <p className="rounded-lg bg-green-50 px-3 py-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
            {t.forgotPassword.sent}
          </p>
        ) : (
          <ForgotPasswordForm />
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Link href="/login" className="text-sm font-medium text-indigo-600 hover:underline">
            {t.forgotPassword.backToLogin}
          </Link>
          <LocaleSwitcher />
        </div>
      </div>
    </main>
  );
}
