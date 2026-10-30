"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addComment, editComment } from "@/lib/actions/discussion";
import { useT } from "@/lib/i18n/context";

type Opt = { id: string; name: string };
type TriggerType = "user" | "docTask" | "docProject";

const MENTION_CLASS = "rounded px-0.5 font-semibold text-indigo-600 dark:text-indigo-400";
const DOC_CLASS = "rounded px-0.5 font-medium text-indigo-600 underline dark:text-indigo-400";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Convertit un corps stocké (@[id] / $[id] + texte) en HTML de l'éditeur.
function bodyToHtml(body: string, names: Record<string, string>, docs: Record<string, string>) {
  let html = "";
  let last = 0;
  const re = /([@$])\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    html += esc(body.slice(last, m.index));
    if (m[1] === "$") {
      html += `<span contenteditable="false" data-doc="${m[2]}" class="${DOC_CLASS}">📄 ${esc(docs[m[2]] ?? "document")}</span>`;
    } else {
      html += `<span contenteditable="false" data-mention="${m[2]}" class="${MENTION_CLASS}">@${esc(names[m[2]] ?? "inconnu")}</span>`;
    }
    last = re.lastIndex;
  }
  html += esc(body.slice(last));
  return html.replace(/\n/g, "<br>");
}

export function CommentBox({
  taskId,
  members,
  taskDocuments,
  projectDocuments,
  commentId,
  initialBody,
  onDone,
}: {
  taskId: string;
  members: Opt[];
  taskDocuments: Opt[];
  projectDocuments: Opt[];
  commentId?: string;
  initialBody?: string;
  onDone?: () => void;
}) {
  const t = useT();
  const editing = !!commentId;
  const editorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [empty, setEmpty] = useState(!initialBody);
  const [trigger, setTrigger] = useState<{ type: TriggerType; query: string } | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();

  const nameById = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const docNameById = Object.fromEntries(
    [...projectDocuments, ...taskDocuments].map((d) => [d.id, d.name]),
  );

  // Pré-remplit l'éditeur en mode édition.
  useEffect(() => {
    if (editing && initialBody && editorRef.current) {
      editorRef.current.innerHTML = bodyToHtml(initialBody, nameById, docNameById);
      setEmpty(false);
      editorRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const source =
    trigger?.type === "docTask"
      ? taskDocuments
      : trigger?.type === "docProject"
        ? projectDocuments
        : members;
  const matches = trigger
    ? source
        .filter((o) =>
          trigger.query === "" ? true : o.name.toLowerCase().includes(trigger.query.toLowerCase()),
        )
        .slice(0, 6)
    : [];
  const open = trigger !== null && matches.length > 0;

  function readTrigger():
    | { type: TriggerType; query: string; node: Text; atStart: number; caret: number }
    | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    if (!editorRef.current?.contains(node)) return null;
    const offset = sel.anchorOffset;
    const before = (node.textContent ?? "").slice(0, offset);
    const m = before.match(/(?:^|\s)(@|\$\$?)([\p{L}\p{N}._-]*)$/u);
    if (!m) return null;
    const type: TriggerType =
      m[1] === "@" ? "user" : m[1] === "$$" ? "docProject" : "docTask";
    return {
      type,
      query: m[2],
      node: node as Text,
      atStart: offset - m[2].length - m[1].length,
      caret: offset,
    };
  }

  function onInput() {
    const ctx = readTrigger();
    const sameContext =
      !!ctx && !!trigger && ctx.type === trigger.type && ctx.query === trigger.query;
    setTrigger(ctx ? { type: ctx.type, query: ctx.query } : null);
    if (!sameContext) setActive(0);

    if (ctx && formRef.current) {
      const range = document.createRange();
      range.setStart(ctx.node, ctx.atStart);
      range.collapse(true);
      const caret = range.getBoundingClientRect();
      const form = formRef.current.getBoundingClientRect();
      setPos({ left: caret.left - form.left, top: caret.bottom - form.top + 4 });
    } else {
      setPos(null);
    }

    setEmpty((editorRef.current?.textContent ?? "").trim() === "");
  }

  function pick(opt: Opt) {
    const ctx = readTrigger();
    if (!ctx) return;
    const range = document.createRange();
    range.setStart(ctx.node, ctx.atStart);
    range.setEnd(ctx.node, ctx.caret);
    range.deleteContents();

    const span = document.createElement("span");
    span.contentEditable = "false";
    if (ctx.type === "user") {
      span.dataset.mention = opt.id;
      span.className = MENTION_CLASS;
      span.textContent = `@${opt.name}`;
    } else {
      span.dataset.doc = opt.id;
      span.className = DOC_CLASS;
      span.textContent = `📄 ${opt.name}`;
    }
    const space = document.createTextNode(" ");

    range.insertNode(space);
    range.insertNode(span);

    const sel = window.getSelection();
    sel?.removeAllRanges();
    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    sel?.addRange(after);

    editorRef.current?.focus();
    setTrigger(null);
    setEmpty(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (open) {
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
        setTrigger(null);
      }
      return;
    }
    // Menu fermé : Entrée envoie, Alt/Maj+Entrée insère un saut de ligne.
    if (e.key === "Enter") {
      if (e.altKey || e.shiftKey) {
        e.preventDefault();
        document.execCommand("insertLineBreak");
        setEmpty(false);
      } else {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    } else if (e.key === "Escape" && editing) {
      onDone?.();
    }
  }

  function serialize(): string {
    const root = editorRef.current;
    if (!root) return "";
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset.mention) return `@[${el.dataset.mention}]`;
        if (el.dataset.doc) return `$[${el.dataset.doc}]`;
        if (el.tagName === "BR") return "\n";
        let s = el.tagName === "DIV" && el.previousSibling ? "\n" : "";
        el.childNodes.forEach((c) => (s += walk(c)));
        return s;
      }
      return "";
    };
    let out = "";
    root.childNodes.forEach((c) => (out += walk(c)));
    return out.replace(/ /g, " ");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = serialize().trim();
    if (!body || pending) return;
    startTransition(async () => {
      if (editing) {
        await editComment(commentId!, body);
        onDone?.();
      } else {
        const fd = new FormData();
        fd.set("taskId", taskId);
        fd.set("body", body);
        await addComment(fd);
        if (editorRef.current) editorRef.current.innerHTML = "";
        setEmpty(true);
      }
      setTrigger(null);
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="relative space-y-2">
      <div className="flex items-start gap-2">
        <div className="relative flex-1">
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
            className="min-h-[2.75rem] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {empty && (
            <span className="pointer-events-none absolute left-3 top-2 text-sm text-zinc-400">
              {t.comments.placeholder}
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="submit"
            disabled={empty || pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "…" : editing ? t.comments.save : t.comments.send}
          </button>
          {editing && onDone && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-lg border border-zinc-300 px-4 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {t.comments.cancel}
            </button>
          )}
        </div>
      </div>

      {open && (
        <ul
          style={pos ? { left: pos.left, top: pos.top } : undefined}
          className="absolute z-10 max-h-56 min-w-[12rem] max-w-xs overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
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
                {trigger?.type === "user" ? m.name : `📄 ${m.name}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
