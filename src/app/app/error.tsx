"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n/context";

// Barrière d'erreur du segment /app. Sans elle, une erreur de rendu côté client
// (par ex. une incohérence de version juste après un déploiement) démonte tout
// l'arbre et laisse une page blanche. Ici on affiche un message traduit avec un
// bouton qui recharge complètement la page (indispensable pour repartir sur la
// dernière version des fichiers).
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t.appError.title}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.appError.desc}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        {t.appError.reload}
      </button>
    </div>
  );
}
