"use client";

import { useState } from "react";
import { CommentBody } from "@/components/CommentBody";
import { CommentBox } from "@/components/CommentBox";
import { formatDateTime } from "@/lib/labels";
import { useT, useLocale } from "@/lib/i18n/context";

type Opt = { id: string; name: string };

export type CommentData = {
  id: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  authorId: string;
  authorName: string;
};

export function EditableComment({
  comment,
  currentUserId,
  names,
  docs,
  taskId,
  members,
  taskDocuments,
  projectDocuments,
}: {
  comment: CommentData;
  currentUserId: string;
  names: Record<string, string>;
  docs: Record<string, string>;
  taskId: string;
  members: Opt[];
  taskDocuments: Opt[];
  projectDocuments: Opt[];
}) {
  const t = useT();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const mine = comment.authorId === currentUserId;

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {comment.authorName}
          </span>
          <span>·</span>
          <span>{formatDateTime(comment.createdAt, locale)}</span>
          {comment.editedAt && (
            <span
              className="italic text-zinc-400 dark:text-zinc-500"
              title={`${t.comments.editedOn} ${formatDateTime(comment.editedAt, locale)}`}
            >
              {t.comments.edited}
            </span>
          )}
        </div>
        {mine && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded px-2 py-0.5 text-xs text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800"
          >
            {t.comments.edit}
          </button>
        )}
      </div>

      {editing ? (
        <CommentBox
          taskId={taskId}
          members={members}
          taskDocuments={taskDocuments}
          projectDocuments={projectDocuments}
          commentId={comment.id}
          initialBody={comment.body}
          onDone={() => setEditing(false)}
        />
      ) : (
        <CommentBody body={comment.body} names={names} docs={docs} />
      )}
    </li>
  );
}
