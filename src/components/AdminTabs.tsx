"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/context";

type AdminTab = "membres" | "identite" | "consommation" | "facturation";

// Onglets de la page d'administration de l'espace, sur le même modèle que
// WorkspaceTabs. Pour l'instant : Membres (actif), puis Identité, Consommation
// et Facturation (à venir).
export function AdminTabs({
  memberCount,
  membres,
  identite,
  consommation,
  facturation,
}: {
  memberCount: number;
  membres: ReactNode;
  identite: ReactNode;
  consommation: ReactNode;
  facturation: ReactNode;
}) {
  const [active, setActive] = useState<AdminTab>("membres");
  const dict = useT();

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "membres", label: `${dict.wsTabs.members} (${memberCount})` },
    { key: "identite", label: dict.workspace.tabIdentity },
    { key: "consommation", label: dict.workspace.tabUsage },
    { key: "facturation", label: dict.workspace.tabBilling },
  ];

  return (
    <div>
      <div
        role="tablist"
        className="flex flex-wrap gap-x-5 gap-y-0.5 border-b border-zinc-200 dark:border-zinc-800"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-1 py-2.5 text-sm font-medium transition ${
              active === t.key
                ? "border-indigo-600 text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-6">
        <div hidden={active !== "membres"}>{membres}</div>
        <div hidden={active !== "identite"}>{identite}</div>
        <div hidden={active !== "consommation"}>{consommation}</div>
        <div hidden={active !== "facturation"}>{facturation}</div>
      </div>
    </div>
  );
}
