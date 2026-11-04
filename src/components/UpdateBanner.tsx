"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";

// Bandeau « nouvelle version disponible ». L'onglet connaît le hash du build
// avec lequel il a été servi (currentSha) ; il interroge périodiquement
// /version et, si le hash déployé diffère, propose de recharger — ce qui charge
// les nouveaux fichiers et évite les erreurs de chunk quand un onglet reste
// ouvert pendant un déploiement. Inactif en local (sha « dev »/inconnu) :
// rien à comparer, donc aucun appel réseau.
const POLL_MS = 60_000;

export function UpdateBanner({ currentSha }: { currentSha: string }) {
  const t = useT();
  const [newSha, setNewSha] = useState<string | null>(null);
  // Version déjà écartée par l'utilisateur (« Plus tard ») : on ne le renotifie
  // pas pour ce hash, mais on le préviendra d'une version encore plus récente.
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSha || currentSha === "dev" || currentSha === "unknown") return;

    let active = true;
    async function check() {
      try {
        const res = await fetch("/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { sha?: string };
        const sha = data.sha;
        if (active && sha && sha !== "dev" && sha !== currentSha) {
          setNewSha(sha);
        }
      } catch {
        // Réseau indisponible : on réessaiera au prochain tick.
      }
    }

    const id = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    check();

    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [currentSha]);

  if (!newSha || newSha === dismissed) return null;

  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-indigo-200 bg-white px-4 py-3 shadow-lg dark:border-indigo-900 dark:bg-zinc-900">
        <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-200">{t.update.available}</span>
        <button
          type="button"
          onClick={() => setDismissed(newSha)}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {t.update.later}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          {t.update.reload}
        </button>
      </div>
    </div>
  );
}
