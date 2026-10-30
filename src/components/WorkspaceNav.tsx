"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Ws = { id: string; name: string; tasks: { id: string; title: string }[] };

// Liste des espaces dans le menu. Le composant est client afin de suivre la
// navigation (usePathname) : on ne déplie que les projets de l'espace visité,
// et cela se met à jour à chaque fois qu'on change d'espace.
export function WorkspaceNav({
  workspaces,
  initialActiveId,
}: {
  workspaces: Ws[];
  initialActiveId: string | null;
}) {
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(initialActiveId);

  // Espace actif = celui de la page visitée, résolu pendant le rendu (motif
  // React d'ajustement d'état sur changement de props, sans effet). Les pages
  // hors-espace (Accueil, Discussions…) et les sous-tâches non listées
  // conservent l'espace courant, pour ne pas vider la liste des projets.
  let nextActive = active;
  const wsMatch = pathname.match(/^\/app\/workspaces\/([^/]+)/);
  if (wsMatch) {
    nextActive = wsMatch[1];
  } else {
    const taskMatch = pathname.match(/^\/app\/tasks\/([^/]+)/);
    if (taskMatch) {
      // Projet de 1er niveau connu → on bascule sur son espace.
      const ws = workspaces.find((w) => w.tasks.some((t) => t.id === taskMatch[1]));
      if (ws) nextActive = ws.id;
    }
  }
  if (nextActive !== active) setActive(nextActive);

  // Mémorise le dernier espace actif (cookie), relu côté serveur pour garder ses
  // projets affichés sur les pages hors-espace et après un rechargement.
  useEffect(() => {
    if (!active) return;
    try {
      document.cookie = `tf_ws=${active}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // Cookie indisponible : simple perte de la préférence, sans incidence.
    }
  }, [active]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Espaces
        </span>
        <Link
          href="/app/workspaces/new"
          className="text-sm text-indigo-600 hover:underline"
          title="Nouvel espace de travail"
        >
          +
        </Link>
      </div>

      <ul className="space-y-3">
        {workspaces.map((ws) => {
          const isActive = ws.id === active;
          return (
            <li key={ws.id}>
              <Link
                href={`/app/workspaces/${ws.id}`}
                className={`block truncate rounded-lg px-2 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  isActive ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white" : ""
                }`}
              >
                {ws.name}
              </Link>
              {isActive && (
                <ul className="mt-1 space-y-0.5 border-l border-zinc-200 pl-3 dark:border-zinc-800">
                  {ws.tasks.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/app/tasks/${t.id}`}
                        className="block truncate rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {t.title}
                      </Link>
                    </li>
                  ))}
                  {ws.tasks.length === 0 && (
                    <li className="px-2 py-1 text-xs italic text-zinc-400">Aucun projet</li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
