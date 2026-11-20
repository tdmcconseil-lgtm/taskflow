"use client";

// Badge d'aide « ? » posé sur un élément clé (il porte `data-hint="<ancre>"`).
// Au clic, il ouvre une petite bulle (titre + explication) issue du registre
// i18n `discovery.hints.<ancre>`. Masqué si le mode découverte est coupé ou si
// l'utilisateur a déjà choisi « Ne plus afficher » pour cette ancre. Une seule
// bulle ouverte à la fois (piloté par le DiscoveryProvider).
import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/context";
import { useDiscovery } from "@/components/DiscoveryProvider";
import { HINT_ANCHORS, type HintAnchor } from "@/lib/discovery";

export function HintBubble({
  anchor,
  placement = "bottom",
  className = "",
}: {
  anchor: HintAnchor;
  // Côté d'ouverture de la bulle par rapport au badge (évite les débordements).
  placement?: "bottom" | "right" | "left";
  className?: string;
}) {
  const t = useT();
  const { enabled, dismissed, openHint, toggleHint, closeHint, dismiss, total } = useDiscovery();
  const wrapRef = useRef<HTMLSpanElement>(null);

  const open = openHint === anchor;

  // Fermeture au clic extérieur et à Échap quand la bulle est ouverte.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeHint();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHint();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeHint]);

  if (!enabled || dismissed.has(anchor)) return null;

  const d = t.discovery;
  const hint = d.hints[anchor];
  const position = HINT_ANCHORS.indexOf(anchor) + 1;
  const progress = d.progress.replace("{current}", String(position)).replace("{total}", String(total));

  const panelPlacement =
    placement === "right"
      ? "left-full top-1/2 ml-2 -translate-y-1/2"
      : placement === "left"
        ? "right-full top-1/2 mr-2 -translate-y-1/2"
        : "left-0 top-full mt-2";

  return (
    <span ref={wrapRef} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        data-hint={anchor}
        aria-label={`${d.badgeLabel} — ${hint.title}`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleHint(anchor);
        }}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold leading-none transition ${
          open
            ? "border-indigo-500 bg-indigo-600 text-white"
            : "border-indigo-300 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        }`}
      >
        ?
      </button>

      {open && (
        <span
          role="dialog"
          className={`absolute z-40 block w-64 cursor-default rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-800 ${panelPlacement}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">{hint.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{hint.body}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{progress}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => dismiss(anchor)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                {d.dismiss}
              </button>
              <button
                type="button"
                onClick={closeHint}
                className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
              >
                {d.gotIt}
              </button>
            </div>
          </div>
        </span>
      )}
    </span>
  );
}
