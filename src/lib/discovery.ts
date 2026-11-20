// Mode découverte — socle partagé (importable côté serveur ET client, sans
// « use server » ni dépendance serveur, pour pouvoir être utilisé dans les
// composants client comme HintBubble / DiscoveryProvider).
// Aide à la prise en main réglée PAR UTILISATEUR : un tour de bienvenue au
// premier login, puis des bulles contextuelles « ? » sur les fonctions clés.
//
// Les textes (titres/corps) vivent dans les dictionnaires i18n
// (src/lib/i18n/dictionaries/*), sous la clé `discovery`. Ce module ne porte que
// la liste ordonnée des ancres et les étapes du tour. La lecture des réglages en
// base se fait côté serveur (cf. src/lib/discovery.server.ts).

// Ancres des 13 bulles d'aide, dans l'ordre d'apparition dans le parcours.
// Chaque ancre correspond à un attribut `data-hint="<ancre>"` posé sur un
// élément clé et à une entrée `discovery.hints.<ancre>` dans les dictionnaires.
export const HINT_ANCHORS = [
  "projet-tache",
  "nouvelle-tache",
  "sous-tache",
  "assigner",
  "echeance",
  "priorite",
  "description",
  "vues",
  "reordonner",
  "inviter",
  "acces",
  "idees",
  "facturation",
] as const;

export type HintAnchor = (typeof HINT_ANCHORS)[number];

// Étapes du tour de bienvenue (5 écrans « Suivant », non bloquant, qu'on peut
// passer). Les libellés viennent des dictionnaires (discovery.tour.steps.<clé>).
export const TOUR_STEPS = [
  "welcome",
  "create",
  "organize",
  "visualize",
  "collaborate",
] as const;

export type TourStep = (typeof TOUR_STEPS)[number];

// Réglages du mode découverte de l'utilisateur courant, lus en base.
export type DiscoverySettings = {
  enabled: boolean;
  tourCompleted: boolean;
  dismissedHints: string[];
};
