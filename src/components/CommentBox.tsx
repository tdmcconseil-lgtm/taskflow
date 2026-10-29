"use client";

import { useRef, useState, useTransition } from "react";
import { addComment } from "@/lib/actions/discussion";

type Member = { id: string; name: string };

const MENTION_CLASS = "rounded px-0.5 font-semibold text-indigo-600 dark:text-indigo-400";

export function CommentBox({ taskId, members }: { taskId: string; members: Member[] }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(true);
  const [mention, setMention] = useState<{ query: string } | null>(null);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();

  const matches = mention
    ? members
        .filter((m) =>
          mention.query === "" ? true : m.name.toLowerCase().includes(mention.query.toLowerCase()),
        )
        .slice(0, 6)
    : [];
  const open = mention !== null && matches.length > 0;

  // Lit le contexte « @requête » juste avant le curseur dans l'éditeur.
  function readMention(): { query: string; node: Text; atStart: number; caret: number } | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    if (!editorRef.current?.contains(node)) return null;
    const offset = sel.anchorOffset;
    const before = (node.textContent ?? "").slice(0, offset);
    const m = before.match(/(?:^|\s)@([\p{L}\p{N}._-]*)$/u);
    if (!m) return null;
    return { query: m[1], node: node as Text, atStart: offset - m[1].length - 1, caret: offset };
  }

  function onInput() {
    const ctx = readMention();
    setMention(ctx ? { query: ctx.query } : null);
    setActive(0);
    setEmpty((editorRef.current?.textContent ?? "").trim() === "");
  }

  function pick(member: Member) {
    const ctx = readMention();
    if (!ctx) return;
    const range = document.createRange();
    range.setStart(ctx.node, ctx.atStart);
    range.setEnd(ctx.node, ctx.caret);
    range.deleteContents();

    const span = document.createElement("span");
    span.dataset.mention = member.id;
    span.contentEditable = "false";
    span.className = MENTION_CLASS;
    span.textContent = `@${member.name}`;
    const space = document.createTextNode(" ");

    range.insertNode(space);
    range.insertNode(span);

    const sel = window.getSelection();
    sel?.removeAllRanges();
    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    sel?.addRange(after);

    editorRef.current?.focus();
    setMention(null);
    setEmpty(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setMention(null);
    }
  }

  // Sérialise le contenu : texte + jetons @[identifiant] pour les mentions.
  function serialize(): string {
    const root = editorRef.current;
    if (!root) return "";
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset.mention) return `@[${el.dataset.mention}]`;
        if (el.tagName === "BR") return "\n";
        let s = el.tagName === "DIV" && el.previousSibling ? "\n" : "";
        el.childNodes.forEach((c) => (s += walk(c)));
        return s;
      }
      return "";
    };
    let out = "";
    root.childNodes.forEach((c) => (out += walk(c)));
    return out.replace(/ /g, " ");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = serialize().trim();
    if (!body || pending) return;
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("body", body);
    startTransition(async () => {
      await addComment(fd);
      if (editorRef.current) editorRef.current.innerHTML = "";
      setEmpty(true);
      setMention(null);
    });
  }

  return (
    <form onSubmit={submit} className="relative space-y-2">
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={onInput}
          onKeyUp={onInput}
          onClick={onInput}
          onKeyDown={onKeyDown}
          className="min-h-[5rem] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {empty && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-zinc-400">
            Écrire un message… Tapez @ pour mentionner quelqu&apos;un.
          </span>
        )}
      </div>

      {open && (
        <ul className="absolute z-10 left-0 right-0 max-h-56 overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {matches.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(m);
                }}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === active
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={empty || pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Envoi…" : "Commenter"}
      </button>
    </form>
  );
}
