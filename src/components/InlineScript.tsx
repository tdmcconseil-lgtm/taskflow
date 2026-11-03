// Script inline (anti-flash) rendu par un composant React. React 19 avertit en
// développement dès qu'un rendu produit une balise <script> (« Scripts inside
// React components are never executed when rendering on the client »). Le motif
// recommandé par Next (guide « preventing-flash-before-hydration ») : servir le
// script en `text/javascript` côté serveur — le navigateur l'exécute pendant le
// parsing du HTML, avant le premier paint — et en `text/plain` côté client — il
// est alors ignoré, sans avertissement. `suppressHydrationWarning` absorbe la
// différence de `type` entre les deux rendus.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
