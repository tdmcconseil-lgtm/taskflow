import { getDictionary } from "@/lib/i18n/server";
import { formatDate, isPast } from "@/lib/labels";
import type { Locale } from "@/lib/i18n/config";

type PendingInvitation = { id: string; email: string; expiresAt: Date };

// Liste en LECTURE SEULE des invitations en attente (aucune action possible).
// Affichée dans l'onglet Membres non-admin et dans la vue Membres de
// l'administration avant « Modifier ». La gestion (relancer / annuler) reste
// dans la vue d'édition de l'administration. Rien n'est rendu s'il n'y en a pas.
export async function PendingInvitations({
  invitations,
  locale,
}: {
  invitations: PendingInvitation[];
  locale: Locale;
}) {
  if (invitations.length === 0) return null;
  const t = await getDictionary(locale);
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {t.members.pendingInvitations}
      </h3>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-dashed border-zinc-300 dark:divide-zinc-800 dark:border-zinc-700">
        {invitations.map((inv) => {
          const expired = isPast(inv.expiresAt);
          return (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-3 bg-white p-4 dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{inv.email}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {expired ? (
                    <span className="text-red-600 dark:text-red-400">{t.members.expired}</span>
                  ) : (
                    <>
                      {t.members.pendingExpires} {formatDate(inv.expiresAt, locale)}
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
