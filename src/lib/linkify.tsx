import type { ReactNode } from "react";

// Détecte les URL dans un texte libre et les rend cliquables. Deux formes :
// http(s)://… et www.… (préfixé https:// à la volée). On s'arrête avant une
// ponctuation finale (« . , ; : ! ? ) ] } » et quotes) pour ne pas l'avaler.
// Seuls http/https sont produits — jamais de schéma exotique (ex. javascript:),
// donc pas de vecteur XSS via le href. Le texte reste échappé par React.
const URL_RE =
  /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]}'"»]|www\.[^\s<]+[^\s<.,;:!?)\]}'"»])/gi;

// Renvoie le texte découpé en segments : chaînes brutes + <a> pour chaque URL.
// Utilisable côté serveur comme client (fonction pure, sans hook ni directive).
export function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const raw = m[0];
    const href = raw.startsWith("http") ? raw : `https://${raw}`;
    out.push(
      <a
        key={`lk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-words text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
      >
        {raw}
      </a>,
    );
    last = URL_RE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
