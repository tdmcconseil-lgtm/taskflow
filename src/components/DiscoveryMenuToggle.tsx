"use client";

// Interrupteur « Mode découverte » posé dans le menu (barre latérale), juste à
// côté de l'interrupteur de thème. Reflète et pilote l'état du DiscoveryProvider.
import { useT } from "@/lib/i18n/context";
import { useDiscovery } from "@/components/DiscoveryProvider";

export function DiscoveryMenuToggle() {
  const t = useT();
  const { enabled, setEnabled } = useDiscovery();
  const label = t.discovery.menuToggle;

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
