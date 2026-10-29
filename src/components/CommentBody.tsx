import type { ReactNode } from "react";

// Rend le corps d'un commentaire : les jetons @[identifiant] deviennent le nom
// de la personne, en gras et bleu.
export function CommentBody({
  body,
  names,
}: {
  body: string;
  names: Record<string, string>;
}) {
  const parts: ReactNode[] = [];
  const re = /@\[([^\]]+)\]/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    const name = names[m[1]] ?? "inconnu";
    parts.push(
      <span key={key++} className="font-semibold text-indigo-600 dark:text-indigo-400">
        @{name}
      </span>,
    );
    last = re.lastIndex;
  }
  if (last < body.length) parts.push(body.slice(last));

  return (
    <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{parts}</p>
  );
}
