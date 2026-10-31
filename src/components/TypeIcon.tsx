// Icône de nature d'une tâche : dossier = projet (tâche racine), case cochée =
// tâche. Remplace l'ancien préfixe texte « Projet : / Tâche : ». Composant pur
// (aucun hook) → utilisable côté serveur comme client. `label` (déjà traduit par
// l'appelant) renseigne le title/aria-label pour l'accessibilité.
export function TypeIcon({
  isProject,
  label,
  className = "h-4 w-4",
}: {
  isProject: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      role={label ? "img" : undefined}
      className="inline-flex shrink-0 items-center text-zinc-400 dark:text-zinc-500"
    >
      {isProject ? (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
          <path
            d="M2.5 6A1.5 1.5 0 0 1 4 4.5h2.8L8.3 6.5H16A1.5 1.5 0 0 1 17.5 8v6.5A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5V6Z"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
          <rect x="3.5" y="3.5" width="13" height="13" rx="3.5" />
          <path d="m6.8 10 2.1 2.1 4.3-4.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
