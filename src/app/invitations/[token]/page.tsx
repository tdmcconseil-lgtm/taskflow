import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { AcceptInvitationForm } from "@/components/AcceptInvitationForm";
import { getSession } from "@/lib/auth/session";
import { buttonClass } from "@/components/Button";
import { logoutAndReturn } from "@/lib/actions/workspaces";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.pageTitles.invitation} — getRIDA` };
}

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

  // Un compte existe-t-il déjà pour cet email ? Si oui, on propose simplement de
  // rejoindre l'espace (sans recréer de mot de passe).
  const existingAccount =
    !invalid && !expired && invitation
      ? (await prisma.user.findUnique({
          where: { email: invitation.email },
          select: { id: true },
        })) !== null
      : false;

  if (invalid || expired) {
    return (
      <Card>
        <h1 className="text-xl font-semibold tracking-tight">{t.invitePage.unavailable}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
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

  // Garde-fou : si une AUTRE session est déjà ouverte sur ce poste, on exige
  // d'abord la déconnexion — sinon l'invitation pourrait être acceptée sous la
  // mauvaise identité (et un email sans compte sauterait la création de profil).
  // Même compte que l'email invité = on laisse rejoindre sans friction.
  const session = await getSession();
  const sessionUser = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true },
      })
    : null;
  if (sessionUser && sessionUser.email !== invitation.email) {
    return (
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight">{t.common.appName}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {t.invitePage.loggedInAs.replace("{name}", sessionUser.name)}{" "}
          {t.invitePage.signOutToContinue
            .replace("{workspace}", invitation.workspace.name)
            .replace("{email}", invitation.email)}
        </p>
        <form action={logoutAndReturn} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={`${buttonClass("primary")} w-full`}>
            {t.invitePage.signOutAndContinue}
          </button>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.common.appName}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {invitation.invitedBy.name} {t.invitePage.invitesYou}{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            « {invitation.workspace.name} »
          </span>
          . {existingAccount ? t.invitePage.alreadyAccount : t.invitePage.createToAccept}
        </p>
      </div>
      <AcceptInvitationForm
        token={token}
        email={invitation.email}
        existingAccount={existingAccount}
      />
    </Card>
  );
}
