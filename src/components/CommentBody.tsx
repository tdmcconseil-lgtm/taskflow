import type { ReactNode } from "react";
import Link from "next/link";

// Rend le corps d'un commentaire : @[id] devient le nom de la personne (gras,
// bleu) et $[id] devient le document, en bleu et cliquable vers sa fiche.
export function CommentBody({
  body,
  names,
  docs = {},
}: {
  body: string;
  names: Record<string, string>;
  docs?: Record<string, string>;
}) {
  const parts: ReactNode[] = [];
  const re = /([@$])\[([^\]]+)\]/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    if (m[1] === "$") {
      const name = docs[m[2]] ?? "document";
      parts.push(
        <Link
          key={key++}
          href={`/app/documents/${m[2]}`}
          className="font-medium text-indigo-600 underline dark:text-indigo-400"
        >
          📄 {name}
        </Link>,
      );
    } else {
      const name = names[m[2]] ?? "inconnu";
      parts.push(
        <span key={key++} className="font-semibold text-indigo-600 dark:text-indigo-400">
          @{name}
        </span>,
      );
    }
    last = re.lastIndex;
  }
  if (last < body.length) parts.push(body.slice(last));

  return (
    <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{parts}</p>
  );
}
