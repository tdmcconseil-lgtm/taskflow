import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { NameForm, EmailForm, PasswordForm } from "@/components/ProfileForms";
import { PhotoCard } from "@/components/PhotoCard";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getDictionary } from "@/lib/i18n/server";
import { cardClass } from "@/components/ui";

export const metadata: Metadata = { title: "Mon profil — Taskflow" };

export default async function ProfilePage({ searchParams }: PageProps<"/app/profile">) {
  const sessionUser = await requireUser();
  const t = await getDictionary();
  const sp = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      photoMime: true,
      photoX: true,
      photoY: true,
      photoZoom: true,
      photoUpdatedAt: true,
    },
  });
  if (!user) return null;

  const banner =
    sp.saved === "1"
      ? t.profile.savedProfile
      : sp.pwChanged === "1"
        ? t.profile.passwordChanged
        : sp.emailSent === "1"
          ? t.profile.emailSent
          : sp.emailChanged === "1"
            ? t.profile.emailChanged
            : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/app" className="text-sm text-zinc-500 hover:underline">
          ← {t.profile.back}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.profile.title}</h1>
      </div>

      {banner && (
        <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {banner}
        </p>
      )}

      {/* Photo */}
      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t.profile.photo}
        </h2>
        <PhotoCard
          userId={user.id}
          initialHasPhoto={user.photoMime !== null}
          initialX={user.photoX}
          initialY={user.photoY}
          initialZoom={user.photoZoom}
          version={user.photoUpdatedAt?.getTime() ?? 0}
          fallback={user.name.trim()[0]?.toUpperCase() ?? "?"}
        />
      </section>

      {/* Identité */}
      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t.profile.identity}
        </h2>
        <NameForm firstName={user.firstName} lastName={user.lastName} />
      </section>

      {/* Langue */}
      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t.profile.language}
        </h2>
        <LocaleSwitcher />
      </section>

      {/* Email */}
      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t.profile.email}
        </h2>
        <EmailForm currentEmail={user.email} />
      </section>

      {/* Mot de passe */}
      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t.profile.password}
        </h2>
        <PasswordForm />
      </section>
    </div>
  );
}
