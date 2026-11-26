"use client";

import { useEffect, useState } from "react";

// Sous-navigation collante de l'accueil : ancres vers les grandes sections
// (Avantages · Comparatif · Tarifs · FAQ). Scroll-spy via IntersectionObserver
// pour surligner la section active. Mobile : chips horizontales défilables
// (overflow-x-auto) — jamais de débordement de la page. Le défilement doux est
// porté par `scroll-smooth` sur <html> (layout) et le décalage par le
// `scroll-mt-*` posé sur chaque section (compense en-tête + sous-nav collants).

export type SubNavItem = { id: string; label: string };

export function LandingSubNav({ items }: { items: SubNavItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // La bande centrale de la fenêtre décide de la section « active » : une
    // section est prise en compte quand elle croise la zone entre 40 % et 45 %
    // de la hauteur du viewport. On garde la plus haute des sections visibles.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Sections de la page"
      className="border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <a
              key={it.id}
              href={`#${it.id}`}
              aria-current={isActive ? "true" : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              }`}
            >
              {it.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
