import Link from "next/link";
import { formatDateTime } from "@/lib/labels";
import type { DiscussionRow } from "@/lib/discussions";
import type { Locale } from "@/lib/i18n/config";

export function DiscussionList({
  rows,
  emptyLabel,
  notFollowingLabel = "(plus suivie)",
  locale = "fr",
}: {
  rows: DiscussionRow[];
  emptyLabel: string;
  notFollowingLabel?: string;
  locale?: Locale;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:text-zinc-300 dark:border-zinc-700">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={`/app/tasks/${r.id}`}
            className="flex items-start gap-3 bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                r.unread ? "bg-indigo-600" : "bg-transparent"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate ${r.unread ? "font-semibold" : "font-medium"}`}>
                  {r.title}
                  {!r.following && (
                    <span className="ml-2 text-xs font-normal text-zinc-400 dark:text-zinc-300">{notFollowingLabel}</span>
                  )}
                </p>
                <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-300">
                  {formatDateTime(r.last.createdAt, locale)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-300">
                <span className="text-zinc-600 dark:text-zinc-300">{r.last.author.name}</span> ·{" "}
                {r.last.body}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-300">{r.workspace}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
