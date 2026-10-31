"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { addFollower } from "@/lib/actions/discussion";
import { inputClass } from "@/components/ui";
import { useT } from "@/lib/i18n/context";
import type { AssigneeInfo } from "@/lib/task-tree";

// Onglet « Abonnés » : liste des personnes qui suivent la tâche, avec ajout
// et retrait de suiveurs (façon « watchers » de Jira).
export function TaskFollowers({
  taskId,
  followers,
  candidates,
  currentUserId,
}: {
  taskId: string;
  followers: AssigneeInfo[];
  candidates: { id: string; name: string }[];
  currentUserId: string;
}) {
  const t = useT();
  const countText =
    followers.length === 0
      ? t.followers.none
      : followers.length === 1
        ? t.followers.countOne
        : t.followers.countMany.replace("{n}", String(followers.length));

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{countText}</p>

      {followers.length > 0 && (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {followers.map((f) => (
            <li
              key={f.id}
              className="flex min-w-0 items-center gap-2 bg-white p-3 dark:bg-zinc-900"
            >
              <UserAvatar user={f} className="h-7 w-7" />
              <span className="truncate text-sm font-medium">{f.name}</span>
              {f.id === currentUserId && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  {t.followers.you}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {candidates.length > 0 && (
        <form action={addFollower} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <select name="userId" defaultValue="" className={`${inputClass} max-w-xs`} required>
            <option value="" disabled>
              {t.followers.addPerson}
            </option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t.followers.add}
          </button>
        </form>
      )}
    </div>
  );
}
