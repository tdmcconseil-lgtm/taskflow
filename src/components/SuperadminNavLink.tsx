"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Accès à la console superadmin : un bouclier (sans libellé), posé près de
// l'ampoule des idées, tout en bas du menu. Rendu uniquement côté serveur pour
// les superadmins (cf. app/layout). Surligné quand on est dans la console.
export function SuperadminNavLink({ label }: { label: string }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/app/superadmin");

  return (
    <Link
      href="/app/superadmin"
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
        active ? "bg-zinc-100 dark:bg-zinc-800" : ""
      }`}
    >
      <span aria-hidden>🛡️</span>
    </Link>
  );
}
