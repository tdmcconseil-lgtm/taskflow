import { ImageResponse } from "next/og";

// Image de partage (Open Graph + Twitter) de l'accueil, générée à la volée.
// La convention de fichier Next ajoute automatiquement og:image et, par repli,
// twitter:image à toutes les pages sous `src/app` — cohérent avec la carte
// twitter `summary_large_image` posée par `buildPageMetadata`.
//
// Voie A : une seule image (URL unique toutes langues). Le wordmark est
// neutre ; la tagline reprend le positionnement par défaut (FR).

export const alt = "getRIDA — Gestion de projet et de tâches en équipe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // Dégradé indigo (accent de marque #4f46e5).
          background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 55%, #6366f1 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 148,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          getRIDA
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 46,
            fontWeight: 400,
            color: "rgba(255,255,255,0.88)",
          }}
        >
          Gestion de projet et de tâches en équipe
        </div>
      </div>
    ),
    { ...size },
  );
}
