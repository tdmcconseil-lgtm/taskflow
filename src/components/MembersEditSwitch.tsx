"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { useT } from "@/lib/i18n/context";

// Onglet Membres de l'administration : par défaut la liste est en lecture seule
// (vue `readOnly`), précédée de la note sur les administrateurs et d'un bouton
// « Modifier » en haut à droite. Au clic, on bascule sur la vue `editable`
// (changement de rôle, désactivation, invitations) ; la barre d'actions montre
// alors « Retour » à gauche du bouton « Inviter un membre ».
export function MembersEditSwitch({
  readOnly,
  editable,
  note,
  inviteButton,
  defaultEditing = false,
}: {
  readOnly: ReactNode;
  editable: ReactNode;
  // Note informative (plusieurs administrateurs), affichée en lecture seule.
  note: ReactNode;
  // Bouton « Inviter un membre », affiché seulement en édition.
  inviteButton: ReactNode;
  // Ouvre d'emblée l'édition (ex. retour après un ajout/une invitation).
  defaultEditing?: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(defaultEditing);

  if (!editing) {
    return (
      <div className="space-y-6">
        {note}
        <div className="flex justify-end">
          <Button type="button" variant="primary" onClick={() => setEditing(true)}>
            {t.members.modify}
          </Button>
        </div>
        {readOnly}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {note}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
          {t.members.back}
        </Button>
        {inviteButton}
      </div>
      {editable}
    </div>
  );
}
