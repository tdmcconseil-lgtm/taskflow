"use client";

// Entrée « Mode découverte » du menu (barre latérale) combinant DEUX accès :
//  1. un interrupteur on/off rapide (active/désactive sans quitter le menu) ;
//  2. un lien (libellé + engrenage) vers le réglage complet, onglet
//     « Découverte » du profil (où vit aussi « Revoir le tour de bienvenue »).
// L'interrupteur reflète et pilote l'état du DiscoveryProvider.
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { useDiscovery } from "@/components/DiscoveryProvider";

export function DiscoveryMenuControl() {
  const t = useT();
  const { enabled, setEnabled } = useDiscovery();
  const label = t.discovery.menuToggle;
  const openSettings = t.discovery.menuOpenSettings;

  return (
    <div className="mt-2 flex items-center justify-between gap-2 px-2 py-1.5">
      {/* Libellé cliquable + engrenage → réglage complet dans le profil. */}
      <Link
        href="/app/profile?tab=decouverte"
        title={openSettings}
        aria-label={openSettings}
        className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      >
        <span className="truncate">{label}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </Link>

      {/* Interrupteur on/off rapide (sans quitter le menu). Violet = actif. */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
