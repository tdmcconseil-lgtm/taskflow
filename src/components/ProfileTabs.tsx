"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/context";

type ProfileTab = "identite" | "connexion" | "notifications";

// Onglets de la page profil, sur le même modèle que AdminTabs.
//   1. Identité — photo + nom/prénom (la langue vit dans la barre de menu)
//   2. Connexion — adresse email + mot de passe
//   3. Notifications
// L'onglet d'arrivée vient du serveur (selon le bandeau de confirmation après
// enregistrement) ; on honore aussi l'ancre #notifications des emails de digest.
export function ProfileTabs({
  identite,
  connexion,
  notifications,
  initialTab = "identite",
}: {
  identite: ReactNode;
  connexion: ReactNode;
  notifications: ReactNode;
  initialTab?: ProfileTab;
}) {
  const [active, setActive] = useState<ProfileTab>(initialTab);
  const dict = useT();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#notifications") {
      setActive("notifications");
    }
  }, []);

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: "identite", label: dict.profile.identity },
    { key: "connexion", label: dict.profile.tabLogin },
    { key: "notifications", label: dict.profile.notifications },
  ];

  return (
    <div>
      <div
        role="tablist"
        className="flex flex-wrap gap-x-5 gap-y-0.5 border-b border-zinc-200 dark:border-zinc-800"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-1 py-2.5 text-sm font-medium transition ${
              active === t.key
                ? "border-indigo-600 text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-6">
        <div hidden={active !== "identite"}>{identite}</div>
        <div hidden={active !== "connexion"}>{connexion}</div>
        <div hidden={active !== "notifications"}>{notifications}</div>
      </div>
    </div>
  );
}
