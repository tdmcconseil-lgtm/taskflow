"use client";

// Réglages du mode découverte (onglet « Découverte » de la page profil) :
// interrupteur global + bouton pour revoir le tour de bienvenue. S'appuie sur le
// DiscoveryProvider, donc reste synchronisé avec l'interrupteur du menu.
import { useT } from "@/lib/i18n/context";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { useDiscovery } from "@/components/DiscoveryProvider";

export function DiscoverySettings() {
  const t = useT();
  const d = t.discovery;
  const { enabled, setEnabled, replayTour } = useDiscovery();

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{d.settingsIntro}</p>

      <label className="flex items-center justify-between gap-3 text-sm font-medium">
        <span>{d.settingsToggle}</span>
        <ToggleSwitch
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
          label={d.settingsToggle}
        />
      </label>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={replayTour}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {d.replayTour}
        </button>
      </div>
    </div>
  );
}
