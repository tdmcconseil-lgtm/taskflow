"use client";

// Script inline (anti-flash) rendu par un composant React. React 19 avertit en
// développement dès qu'un rendu produit une balise <script> exécutable
// (« Scripts inside React components are never executed when rendering on the
// client »). Le motif recommandé par Next (guide « preventing-flash-before-
// hydration ») : servir le script en `text/javascript` côté serveur — le
// navigateur l'exécute pendant le parsing du HTML, avant le premier paint — et
// en `text/plain` côté client — React le voit alors comme un bloc de données
// (cf. isScriptDataBlock de react-dom), pas comme un script, donc sans
// avertissement. `suppressHydrationWarning` absorbe la différence de `type`.
//
// IMPÉRATIF : ce composant doit être `"use client"`. Le ternaire `typeof window`
// ne bascule sur `text/plain` que si le composant RÉ-EXÉCUTE son rendu côté
// client. Utilisé tel quel dans un composant serveur (ex. le root layout), il
// n'est évalué que sur le serveur → toujours `text/javascript` → React recrée un
// `<script>` exécutable au remontage Strict Mode (dev) et avertit. En le rendant
// client, le SSR émet toujours `text/javascript` (anti-flash préservé au
// chargement direct) et le rendu client émet `text/plain` (plus d'avertissement).
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
