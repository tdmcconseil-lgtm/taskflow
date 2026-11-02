"use client";

import { useEffect, useState } from "react";

type Labels = { title: string; primary: string; edit: string; cancel: string; close: string };

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable === true
  );
}

function isVisible(el: Element): boolean {
  const h = el as HTMLElement;
  return h.offsetParent !== null || el.getClientRects().length > 0;
}

// Gestionnaire global de raccourcis clavier (voir spec « Raccourcis clavier ») :
//  - Cmd/Ctrl + Entrée : déclenche le bouton bleu principal de l'écran (autorisé
//    même quand le focus est dans un champ) ;
//  - une touche simple mappée via data-shortcut-key (ex. « e » = Modifier),
//    ignorée si le focus est dans un champ ou si un modificateur est enfoncé ;
//  - « ? » : ouvre/ferme l'aide listant les raccourcis.
// On ignore `isComposing` (accents, claviers morts) et `e.repeat`.
export function KeyboardShortcuts({ labels }: { labels: Labels }) {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.isComposing || e.repeat) return;

      // Cmd/Ctrl + Entrée → bouton bleu principal (y compris depuis un champ).
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        const active = document.activeElement as HTMLElement | null;
        const form = active?.closest?.("form") ?? null;
        let target: HTMLElement | null = form
          ? (form.querySelector("[data-primary-action]") as HTMLElement | null)
          : null;
        if (!target) {
          target =
            ([...document.querySelectorAll("[data-primary-action]")].find(isVisible) as
              | HTMLElement
              | undefined) ?? null;
        }
        if (target) {
          e.preventDefault();
          target.click();
        }
        return;
      }

      // Au-delà, on ignore les combinaisons avec modificateur.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(document.activeElement)) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setHelpOpen(false);
        return;
      }

      // Touche simple mappée (ex. « e » = Modifier sur le détail d'une tâche).
      const el = [...document.querySelectorAll(`[data-shortcut-key="${e.key.toLowerCase()}"]`)].find(
        isVisible,
      ) as HTMLElement | undefined;
      if (el) {
        e.preventDefault();
        el.click();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!helpOpen) return null;

  const kbd =
    "rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{labels.title}</h2>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {labels.close}
          </button>
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-zinc-600 dark:text-zinc-300">{labels.primary}</dt>
            <dd>
              <kbd className={kbd}>⌘/Ctrl + ⏎</kbd>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-zinc-600 dark:text-zinc-300">{labels.edit}</dt>
            <dd>
              <kbd className={kbd}>E</kbd>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-zinc-600 dark:text-zinc-300">{labels.cancel}</dt>
            <dd>
              <kbd className={kbd}>Échap</kbd>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
