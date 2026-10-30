import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { ConfirmEmailForm } from "@/components/ConfirmEmailForm";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Changement d'email — Taskflow" };

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </main>
  );
}

export default async function ConfirmEmailPage({
  params,
}: PageProps<"/profile/confirm-email/[token]">) {
  const { token } = await params;
  const t = await getDictionary();

  const request = await prisma.emailChangeRequest.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { newEmail: true, expiresAt: true },
  });

  const expired = request && request.expiresAt.getTime() < Date.now();

  if (!request || expired) {
    return (
      <Card>
        <h1 className="text-xl font-semibold tracking-tight">{t.confirmEmail.unavailable}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-300">
          {expired ? t.confirmEmail.expired : t.confirmEmail.invalid}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          {t.invitePage.goToLogin}
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Taskflow</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-300">
          {t.confirmEmail.prompt}{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{request.newEmail}</span>.
        </p>
      </div>
      <ConfirmEmailForm token={token} />
    </Card>
  );
}
