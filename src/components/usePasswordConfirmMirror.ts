import { useRef, type FormEvent } from "react";

// Recopie le mot de passe dans le champ de confirmation UNIQUEMENT lorsqu'il
// provient du navigateur — mot de passe généré, remplissage automatique ou
// collage. Ces insertions arrivent via un événement `input` sans `inputType` ;
// la saisie manuelle (`insertText`, suppressions…) en a un, et n'est donc pas
// recopiée, pour que la confirmation garde son rôle anti-faute de frappe.
//
// Usage : brancher `onInput={onPasswordInput}` sur le champ mot de passe et
// `ref={confirmRef}` sur le champ de confirmation (champs non contrôlés).
export function usePasswordConfirmMirror() {
  const confirmRef = useRef<HTMLInputElement>(null);

  function onPasswordInput(e: FormEvent<HTMLInputElement>) {
    const inputType = (e.nativeEvent as InputEvent).inputType;
    if (!inputType && confirmRef.current) {
      confirmRef.current.value = e.currentTarget.value;
    }
  }

  return { confirmRef, onPasswordInput };
}
