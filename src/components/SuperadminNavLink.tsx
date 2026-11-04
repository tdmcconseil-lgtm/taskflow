"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Accès à la console superadmin : un bouclier (sans libellé), posé près de
// l'ampoule des idées, tout en bas du menu. Rendu uniquement côté serveur pour
// les superadmins (cf. app/layout). Surligné quand on est dans la console.
// `recoveryCount` = nombre d'espaces à recouvrer (suspendus ou facture échue) :
// affiché en pastille sur le bouclier quand > 0.
export function SuperadminNavLink({
  label,
  recoveryCount = 0,
}: {
  label: string;
  recoveryCount?: number;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith("/app/superadmin");

  return (
    <Link
      href="/app/superadmin"
      title={label}
      aria-label={recoveryCount > 0 ? `${label} (${recoveryCount})` : label}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
        active ? "bg-zinc-100 dark:bg-zinc-800" : ""
      }`}
    >
      <span aria-hidden>🛡️</span>
      {recoveryCount > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-4 text-white">
          {recoveryCount > 99 ? "99+" : recoveryCount}
        </span>
      )}
    </Link>
  );
}
