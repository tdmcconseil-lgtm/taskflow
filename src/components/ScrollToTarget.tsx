"use client";

import { useEffect } from "react";

// Depuis le flux d'événements, on arrive sur la fiche de tâche avec ?target=<id>.
// Ce composant fait défiler jusqu'à l'élément ciblé (commentaire, décision ou
// document, identifié par id="evt-<id>") et le met brièvement en surbrillance.
// Sans cible, ou si l'élément n'est pas trouvé, il ne fait rien.
export function ScrollToTarget({ targetId }: { targetId?: string }) {
  useEffect(() => {
    if (!targetId) return;
    // Laisse le temps à l'onglet actif de se peindre avant de défiler.
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`evt-${targetId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("evt-flash");
      window.setTimeout(() => el.classList.remove("evt-flash"), 2200);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [targetId]);

  return null;
}
