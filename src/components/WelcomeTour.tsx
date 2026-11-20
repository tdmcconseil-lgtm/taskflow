"use client";

// Tour de bienvenue : un petit overlay maison de 5 étapes « Suivant », non
// bloquant (qu'on peut passer à tout moment). À la fin ou au passage, le parent
// (DiscoveryProvider) marque le tour comme vu. Aucune dépendance externe.
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { TOUR_STEPS } from "@/lib/discovery";

export function WelcomeTour({ onDone }: { onDone: () => void }) {
  const t = useT();
  const tour = t.discovery.tour;
  const [index, setIndex] = useState(0);

  const last = TOUR_STEPS.length - 1;
  const step = TOUR_STEPS[index];
  const content = tour.steps[step];
  const isLast = index === last;

  // Fermeture au clavier (Échap = passer), navigation aux flèches.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, last));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDone, last]);

  const stepLabel = tour.step
    .replace("{current}", String(index + 1))
    .replace("{total}", String(TOUR_STEPS.length));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={content.title}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
            {stepLabel}
          </span>
          <button
            type="button"
            onClick={onDone}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            {tour.skip}
          </button>
        </div>

        <h2 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {content.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{content.body}</p>

        {isLast && (
          <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            {tour.endNote}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          {/* Points de progression */}
          <div className="flex items-center gap-1.5" aria-hidden>
            {TOUR_STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-indigo-600" : "w-1.5 bg-zinc-300 dark:bg-zinc-600"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {tour.back}
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={onDone}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {tour.done}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(i + 1, last))}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {tour.next}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
