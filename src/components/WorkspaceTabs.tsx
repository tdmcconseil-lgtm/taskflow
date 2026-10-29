"use client";

import { useState, type ReactNode } from "react";

type WsTab = "projets" | "membres" | "suivies" | "evenements" | "discussions";

const TABS: { key: WsTab; label: string }[] = [
  { key: "projets", label: "Projets" },
  { key: "membres", label: "Membres" },
  { key: "suivies", label: "Tâches suivies" },
  { key: "evenements", label: "Événements" },
  { key: "discussions", label: "Discussions" },
];

function rememberTab(tab: WsTab) {
  try {
    document.cookie = `tf_ws_tab=${tab}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookies indisponibles : préférence simplement non conservée.
  }
}

export function WorkspaceTabs({
  initialTab = "projets",
  projets,
  membres,
  suivies,
  evenements,
  discussions,
}: {
  initialTab?: WsTab;
  projets: ReactNode;
  membres: ReactNode;
  suivies: ReactNode;
  evenements: ReactNode;
  discussions: ReactNode;
}) {
  const [active, setActive] = useState<WsTab>(initialTab);

  function open(tab: WsTab) {
    setActive(tab);
    rememberTab(tab);
  }

  return (
    <div>
      <div
        role="tablist"
        className="flex flex-wrap gap-5 border-b border-zinc-200 dark:border-zinc-800"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => open(t.key)}
            className={`-mb-px border-b-2 px-1 py-2.5 text-sm font-medium transition ${
              active === t.key
                ? "border-indigo-600 text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
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
