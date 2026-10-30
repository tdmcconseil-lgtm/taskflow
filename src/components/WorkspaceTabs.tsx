"use client";

import { useState, type ReactNode } from "react";

type WsTab = "projets" | "membres" | "suivies" | "evenements" | "discussions";

const TABS: { key: WsTab; label: string }[] = [
  { key: "projets", label: "Projets" },
  { key: "membres", label: "Membres" },
  { key: "suivies", label: "Mes tâches suivies" },
  { key: "evenements", label: "Événements" },
  { key: "discussions", label: "Discussions" },
];

export function WorkspaceTabs({
  initialTab = "projets",
  memberCount,
  projets,
  membres,
  suivies,
  evenements,
  discussions,
}: {
  initialTab?: WsTab;
  memberCount: number;
  projets: ReactNode;
  membres: ReactNode;
  suivies: ReactNode;
  evenements: ReactNode;
  discussions: ReactNode;
}) {
  const [active, setActive] = useState<WsTab>(initialTab);

  function open(tab: WsTab) {
    setActive(tab);
  }

  return (
    <div>
      <div
        role="tablist"
        className="no-scrollbar flex gap-5 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => open(t.key)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-1 py-2.5 text-sm font-medium transition ${
              active === t.key
                ? "border-indigo-600 text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.key === "membres" ? `${t.label} (${memberCount})` : t.label}
          </button>
        ))}
      </div>

      <div className="pt-6">
        <div hidden={active !== "projets"}>{projets}</div>
        <div hidden={active !== "membres"}>{membres}</div>
        <div hidden={active !== "suivies"}>{suivies}</div>
        <div hidden={active !== "evenements"}>{evenements}</div>
        <div hidden={active !== "discussions"}>{discussions}</div>
      </div>
    </div>
  );
}
