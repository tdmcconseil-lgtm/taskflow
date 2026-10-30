import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { AcceptInvitationForm } from "@/components/AcceptInvitationForm";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Invitation — Taskflow" };

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </main>
  );
}

export default async function AcceptInvitationPage({
  params,
}: PageProps<"/invitations/[token]">) {
  const { token } = await params;
  const t = await getDictionary();

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      workspace: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  });

  const invalid = !invitation || invitation.acceptedAt;
  const expired = invitation && invitation.expiresAt.getTime() < Date.now();

  if (invalid || expired) {
    return (
      <Card>
        <h1 className="text-xl font-semibold tracking-tight">{t.invitePage.unavailable}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {expired ? t.invitePage.expired : t.invitePage.invalid}
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
        <p className="mt-2 text-sm text-zinc-500">
          {invitation.invitedBy.name} {t.invitePage.invitesYou}{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            « {invitation.workspace.name} »
          </span>
          . {t.invitePage.createToAccept}
        </p>
      </div>
      <AcceptInvitationForm token={token} email={invitation.email} />
    </Card>
  );
}
