"use client";

import { useState } from "react";
import { archiveWorkspace } from "@/lib/actions/workspaces";
import { Button } from "@/components/Button";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/context";

// Archivage d'un espace : on avertit d'abord que les espaces archivés sont
// supprimés au bout d'un mois, puis on demande une confirmation explicite avant
// de lancer l'action serveur (qui redirige vers l'accueil avec un message).
export function ArchiveConfirm({ workspaceId }: { workspaceId: string }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-sm text-amber-700 dark:text-amber-400">{t.workspace.archiveWarning}</p>

      {confirming ? (
        <form action={archiveWorkspace} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <span className="text-sm font-medium">{t.workspace.archiveConfirmQuestion}</span>
          <SubmitButton>{t.workspace.archiveConfirm}</SubmitButton>
          <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
            {t.workspace.archiveCancel}
          </Button>
        </form>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
          {t.workspace.archive}
        </Button>
      )}
    </div>
  );
}
