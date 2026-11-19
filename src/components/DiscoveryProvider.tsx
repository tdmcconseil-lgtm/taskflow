"use client";

// Fournit l'état du mode découverte à l'ensemble de l'application connectée :
// l'interrupteur global, les bulles masquées et le tour de bienvenue. L'état
// client est la source de vérité pendant la session (affichage immédiat) ; les
// changements sont persistés en base en arrière-plan (synchro multi-appareils).
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { HINT_ANCHORS, type HintAnchor } from "@/lib/discovery";
import {
  setDiscoveryMode,
  dismissHint as persistDismissHint,
  completeTour,
} from "@/lib/actions/discovery";
import { WelcomeTour } from "@/components/WelcomeTour";

type DiscoveryContextValue = {
  // Interrupteur global du mode découverte.
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  // Ancres des bulles masquées (« Ne plus afficher »).
  dismissed: Set<string>;
  dismiss: (anchor: HintAnchor) => void;
  // Bulle actuellement ouverte (une seule à la fois).
  openHint: string | null;
  toggleHint: (anchor: HintAnchor) => void;
  closeHint: () => void;
  // Nombre total d'ancres connues (pour le compteur de progression).
  total: number;
  // Relance le tour de bienvenue (depuis les réglages).
  replayTour: () => void;
};

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

export function useDiscovery(): DiscoveryContextValue {
  const ctx = useContext(DiscoveryContext);
  if (!ctx) throw new Error("useDiscovery doit être utilisé dans <DiscoveryProvider>");
  return ctx;
}

export function DiscoveryProvider({
  initialEnabled,
  initialDismissed,
  tourCompleted,
  children,
}: {
  initialEnabled: boolean;
  initialDismissed: string[];
  tourCompleted: boolean;
  children: ReactNode;
}) {
  const [enabled, setEnabledState] = useState(initialEnabled);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set(initialDismissed));
  const [openHint, setOpenHint] = useState<string | null>(null);
  // Le tour s'affiche au premier login (mode actif + jamais vu), ou sur demande.
  const [showTour, setShowTour] = useState<boolean>(initialEnabled && !tourCompleted);
  const [, startTransition] = useTransition();

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    if (!value) {
      setOpenHint(null);
      setShowTour(false);
    }
    startTransition(async () => {
      await setDiscoveryMode(value);
    });
  }, []);

  const dismiss = useCallback((anchor: HintAnchor) => {
    setDismissed((prev) => {
      if (prev.has(anchor)) return prev;
      const next = new Set(prev);
      next.add(anchor);
      return next;
    });
    setOpenHint((cur) => (cur === anchor ? null : cur));
    startTransition(async () => {
      await persistDismissHint(anchor);
    });
  }, []);

  const toggleHint = useCallback((anchor: HintAnchor) => {
    setOpenHint((cur) => (cur === anchor ? null : anchor));
  }, []);

  const closeHint = useCallback(() => setOpenHint(null), []);

  const finishTour = useCallback(() => {
    setShowTour(false);
    startTransition(async () => {
      await completeTour();
    });
  }, []);

  const replayTour = useCallback(() => {
    setOpenHint(null);
    setShowTour(true);
  }, []);

  const value = useMemo<DiscoveryContextValue>(
    () => ({
      enabled,
      setEnabled,
      dismissed,
      dismiss,
      openHint,
      toggleHint,
      closeHint,
      total: HINT_ANCHORS.length,
      replayTour,
    }),
    [enabled, setEnabled, dismissed, dismiss, openHint, toggleHint, closeHint, replayTour],
  );

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
      {enabled && showTour && <WelcomeTour onDone={finishTour} />}
    </DiscoveryContext.Provider>
  );
}
