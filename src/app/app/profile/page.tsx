import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { NameForm, EmailForm, PasswordForm } from "@/components/ProfileForms";
import { PhotoCard } from "@/components/PhotoCard";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ProfileTabs } from "@/components/ProfileTabs";
import { getEffectivePreference } from "@/lib/notify";
import { getDictionary } from "@/lib/i18n/server";
import { cardClass } from "@/components/ui";

export const metadata: Metadata = { title: "Mon profil — getRIDA" };

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

  const notifPref = await getEffectivePreference(user.id);

  // Onglet d'arrivée : on retombe sur l'onglet concerné par le bandeau de
  // confirmation après un enregistrement (mot de passe / email → Connexion,
  // notifications → Notifications, sinon Identité).
  const initialTab =
    sp.notifSaved === "1"
      ? "notifications"
      : sp.pwChanged === "1" || sp.emailSent === "1" || sp.emailChanged === "1"
        ? "connexion"
        : "identite";

  const banner =
    sp.saved === "1"
      ? t.profile.savedProfile
      : sp.pwChanged === "1"
        ? t.profile.passwordChanged
        : sp.emailSent === "1"
          ? t.profile.emailSent
          : sp.emailChanged === "1"
            ? t.profile.emailChanged
            : sp.notifSaved === "1"
              ? t.profile.notifSaved
              : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.profile.title}</h1>
      </div>

      {banner && (
        <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {banner}
        </p>
      )}

      <ProfileTabs
        initialTab={initialTab}
        identite={
          <div className="space-y-6">
            {/* Photo */}
            <section className={cardClass}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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

            {/* Nom et prénom */}
            <section className={cardClass}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t.profile.identity}
              </h2>
              <NameForm firstName={user.firstName} lastName={user.lastName} />
            </section>
          </div>
        }
        connexion={
          <div className="space-y-6">
            {/* Email */}
            <section className={cardClass}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t.profile.email}
              </h2>
              <EmailForm currentEmail={user.email} />
            </section>

            {/* Mot de passe */}
            <section className={cardClass}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t.profile.password}
              </h2>
              <PasswordForm />
            </section>
          </div>
        }
        notifications={
          <section id="notifications" className={cardClass}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t.profile.notifications}
            </h2>
            <NotificationSettings pref={notifPref} />
          </section>
        }
      />
    </div>
  );
}
