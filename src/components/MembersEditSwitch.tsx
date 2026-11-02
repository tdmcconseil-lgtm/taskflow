"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { useT } from "@/lib/i18n/context";

// Onglet Membres de l'administration : par défaut la liste est en lecture seule
// (vue `readOnly`), avec un bouton « Modifier » en haut à droite. Au clic, on
// bascule sur la vue `editable` (ajout de membre, changement de rôle,
// désactivation, gestion des invitations), le bouton devenant « Terminer ».
export function MembersEditSwitch({
  readOnly,
  editable,
  defaultEditing = false,
}: {
  readOnly: ReactNode;
  editable: ReactNode;
  // Ouvre d'emblée l'édition (ex. retour après un ajout/une invitation).
  defaultEditing?: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(defaultEditing);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          type="button"
          variant={editing ? "secondary" : "primary"}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? t.members.doneEditing : t.members.modify}
        </Button>
      </div>
      {editing ? editable : readOnly}
    </div>
  );
}
