import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Réinitialisation du mot de passe — getRIDA" };

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </main>
  );
}

export default async function ResetPasswordPage({ params }: PageProps<"/reset-password/[token]">) {
  const { token } = await params;
  const t = await getDictionary();

  const request = await prisma.passwordResetRequest.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { email: true } } },
  });

  const expired = request && request.expiresAt.getTime() < Date.now();

  if (!request || expired) {
    return (
      <Card>
        <h1 className="text-xl font-semibold tracking-tight">{t.forgotPassword.unavailable}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {expired ? t.forgotPassword.expired : t.forgotPassword.invalid}
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          {t.forgotPassword.title}
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.forgotPassword.resetTitle}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {t.forgotPassword.resetDesc.replace("{email}", request.user.email)}
        </p>
      </div>
      <ResetPasswordForm token={token} email={request.user.email} />
    </Card>
  );
}
