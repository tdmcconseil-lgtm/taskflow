"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Accès au module Idées : une simple ampoule (sans libellé), posée en bas du
// menu, juste au-dessus du sélecteur de langue. Surlignée quand on est dans le
// module. Le libellé reste accessible (title + aria-label) bien que masqué.
export function IdeasNavLink({ label }: { label: string }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/app/idees");

  return (
    <Link
      href="/app/idees"
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
        active ? "bg-zinc-100 dark:bg-zinc-800" : ""
      }`}
    >
      <span aria-hidden>💡</span>
    </Link>
  );
}
