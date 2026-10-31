"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Liens principaux du menu (Accueil, Discussions, Événements). Client afin de
// suivre la navigation (usePathname) et surligner en gris l'item de la page
// courante, exactement comme un espace sélectionné.
export function NavLinks({
  labels,
  unreadCount,
  eventsCount,
}: {
  labels: { home: string; discussions: string; events: string };
  unreadCount: number;
  eventsCount: number;
}) {
  const pathname = usePathname();
  const base =
    "rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800";
  const activeCls = "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white";

  const homeActive = pathname === "/app";
  const discussionsActive = pathname.startsWith("/app/discussions");
  const eventsActive = pathname.startsWith("/app/evenements");

  return (
    <div className="space-y-0.5">
      <Link href="/app" className={`block ${base} ${homeActive ? activeCls : ""}`}>
        🏠 {labels.home}
      </Link>
      <Link
        href="/app/discussions"
        className={`flex items-center justify-between ${base} ${discussionsActive ? activeCls : ""}`}
      >
        <span>💬 {labels.discussions}</span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </Link>
      <Link
        href="/app/evenements"
        className={`flex items-center justify-between ${base} ${eventsActive ? activeCls : ""}`}
      >
        <span>🔔 {labels.events}</span>
        {eventsCount > 0 && (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
            {eventsCount > 99 ? "99+" : eventsCount}
          </span>
        )}
      </Link>
    </div>
  );
}
