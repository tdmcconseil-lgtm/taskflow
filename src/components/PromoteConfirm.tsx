"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/Button";
import { promoteTaskToProject } from "@/lib/actions/tasks";
import { useT } from "@/lib/i18n/context";

// Bouton de validation de la transformation d'une tâche en projet. Le socle de
// membres amorcés et l'avertissement sont affichés par la page serveur ; ici on
// ne fait que confirmer et afficher une éventuelle erreur (déjà traduite).
export function PromoteConfirm({ taskId }: { taskId: string }) {
  const m = useT().promoteToProject;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await promoteTaskToProject(taskId);
      if ("ok" in res) {
        router.push(`/app/tasks/${taskId}`);
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
        disabled={pending}
        className={buttonClass("primary", "md")}
      >
        {pending ? m.confirming : m.confirmButton}
      </button>
    </div>
  );
}
