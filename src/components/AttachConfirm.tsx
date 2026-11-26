"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/Button";
import { attachProjectToProject } from "@/lib/actions/tasks";
import { useT } from "@/lib/i18n/context";

// Bouton de validation du rattachement d'un projet sous un autre. L'impact
// (blocages, exposition, notice) est calculé et affiché par la page serveur ;
// ici on ne fait que confirmer. Le bouton reste DÉSACTIVÉ tant qu'il reste des
// bloqueurs (`disabled`) — il faut nettoyer avant côté projet d'accueil/source.
export function AttachConfirm({
  projectId,
  targetId,
  disabled,
}: {
  projectId: string;
  targetId: string;
  disabled: boolean;
}) {
  const m = useT().attachToProject;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await attachProjectToProject(projectId, targetId);
      if ("ok" in res) {
        router.push(`/app/tasks/${projectId}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={pending || disabled}
        className={buttonClass("primary", "md")}
      >
        {pending ? m.confirming : m.confirmButton}
      </button>
      {disabled && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{m.blockedHint}</p>
      )}
    </div>
  );
}
