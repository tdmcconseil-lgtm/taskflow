"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// Menu latéral en tiroir pour les petits écrans (téléphone/tablette).
// Le bouton ☰ ouvre un panneau coulissant contenant la même navigation que la
// barre latérale de bureau. Se ferme en naviguant, au clic sur le fond, ou avec
// la touche Échap. Masqué à partir de « md » (la barre latérale prend le relais).
export function MobileDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Refermer à chaque changement de page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Échap pour fermer + blocage du défilement de l'arrière-plan quand ouvert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="-ml-1 rounded-lg p-2 text-xl leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto border-r border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="mb-2 self-end rounded-lg p-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
            {children}
          </aside>
        </div>
      )}
    </div>
  );
}
