"use client";

import { useEffect } from "react";

// Barrière d'erreur de dernier recours : elle remplace tout le document quand
// même la mise en page racine échoue. Elle ne peut pas accéder au contexte i18n
// (elle rend son propre <html>), alors on lit la langue dans le cookie `tf_lang`
// et on embarque un petit dictionnaire minimal. Le bouton recharge entièrement
// la page (récupère la dernière version après un déploiement).
const MESSAGES = {
  fr: {
    title: "Une erreur est survenue",
    desc: "La page n'a pas pu s'afficher. Cela arrive parfois juste après une mise à jour : rechargez la page pour récupérer la dernière version.",
    reload: "Recharger la page",
  },
  en: {
    title: "Something went wrong",
    desc: "The page could not be displayed. This can happen right after an update: reload the page to get the latest version.",
    reload: "Reload the page",
  },
  es: {
    title: "Se ha producido un error",
    desc: "No se pudo mostrar la página. Esto puede ocurrir justo después de una actualización: recarga la página para obtener la última versión.",
    reload: "Recargar la página",
  },
} as const;

type Lang = keyof typeof MESSAGES;

function detectLang(): Lang {
  if (typeof document === "undefined") return "fr";
  const m = document.cookie.match(/(?:^|; )tf_lang=(fr|en|es)/);
  return (m?.[1] as Lang) ?? "fr";
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const m = MESSAGES[detectLang()];

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <div style={{ maxWidth: 440, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>{m.title}</h1>
          <p style={{ fontSize: 14, color: "#71717a", marginBottom: 20 }}>{m.desc}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: "none",
              borderRadius: 8,
              background: "#4f46e5",
              color: "#fff",
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {m.reload}
          </button>
        </div>
      </body>
    </html>
  );
}
