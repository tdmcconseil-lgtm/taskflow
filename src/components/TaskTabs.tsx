"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { markRead } from "@/lib/actions/discussion";
import { useT } from "@/lib/i18n/context";

type TabKey = "sous" | "docs" | "decisions" | "chat" | "followers" | "activite";
type TaskLabelKey =
  | "subtasks"
  | "conversation"
  | "decisions"
  | "documents"
  | "subscribers"
  | "activity";

const TABS: { key: TabKey; labelKey: TaskLabelKey }[] = [
  { key: "sous", labelKey: "subtasks" },
  { key: "chat", labelKey: "conversation" },
  { key: "decisions", labelKey: "decisions" },
  { key: "docs", labelKey: "documents" },
  { key: "followers", labelKey: "subscribers" },
  { key: "activite", labelKey: "activity" },
];

// Mémorise l'onglet choisi (cookie) pour le conserver d'une tâche à l'autre.
function rememberTab(tab: TabKey) {
  try {
    document.cookie = `tf_tab=${tab}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookies indisponibles : simple perte de la préférence, sans incidence.
  }
}

// Onglets de la fiche de tâche. Le compteur de non-lus du Chat persiste tant
// que l'onglet n'est pas ouvert ; à son ouverture, la discussion est marquée lue.
export function TaskTabs({
  taskId,
  initialTab = "sous",
  chatUnread,
  followerCount,
  subtasks,
  documents,
  decisions,
  chat,
  followers,
  activity,
}: {
  taskId: string;
  initialTab?: TabKey;
  chatUnread: number;
  followerCount: number;
  subtasks: ReactNode;
  documents: ReactNode;
  decisions: ReactNode;
  chat: ReactNode;
  followers: ReactNode;
  activity: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>(initialTab);
  const [unread, setUnread] = useState(chatUnread);
  const marked = useRef(false);
  const router = useRouter();
  const dict = useT();

  function markChat() {
    if (marked.current) return;
    marked.current = true;
    if (unread > 0) setUnread(0);
    markRead(taskId).then(() => router.refresh());
  }

  // Si le chat est déjà l'onglet actif à l'arrivée (préférence conservée),
  // on marque la discussion lue comme à l'ouverture.
  useEffect(() => {
    if (active === "chat") markChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function open(tab: TabKey) {
    setActive(tab);
    rememberTab(tab);
    if (tab === "chat") markChat();
  }

  return (
    <div>
      <div
        role="tablist"
        className="flex flex-wrap gap-x-6 gap-y-0.5 border-b border-zinc-200 dark:border-zinc-800"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => open(t.key)}
            className={`-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-2.5 text-sm font-medium transition ${
              active === t.key
                ? "border-indigo-600 text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.key === "followers" && <span aria-hidden>👁</span>}
            {t.key === "followers"
              ? `${dict.taskTabs.subscribers} (${followerCount})`
              : dict.taskTabs[t.labelKey]}
            {t.key === "chat" && unread > 0 && (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="pt-6">
        <div hidden={active !== "sous"}>{subtasks}</div>
        <div hidden={active !== "chat"}>{chat}</div>
        <div hidden={active !== "decisions"}>{decisions}</div>
        <div hidden={active !== "docs"}>{documents}</div>
        <div hidden={active !== "followers"}>{followers}</div>
        <div hidden={active !== "activite"}>{activity}</div>
      </div>
    </div>
  );
}
