import type { ReactNode } from "react";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { overdueInvoices } from "@/lib/billing/suspension";
import { SuspendedNotice } from "@/components/SuspendedNotice";

// Point d'entrée commun à toutes les pages d'un espace : applique la COUPURE
// administrative sur facture échue impayée. Quand l'espace est suspendu, on
// affiche l'écran de régularisation À LA PLACE de la page demandée (pas de
// redirection, donc pas de boucle, et toutes les sous-pages sont couvertes) :
//   - administrateur → factures à régler + bouton « Payer » (seule action possible) ;
//   - membre → message « espace suspendu, un administrateur doit régulariser ».
// Un non-membre n'est pas concerné : on laisse la page gérer son propre contrôle
// d'accès (notFound). La suspension étant dérivée des factures (cf. suspension.ts),
// régler la dernière facture échue rétablit l'accès immédiatement.
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await requireUser();
  const membership = await getMembership(user.id, workspaceId);
  if (!membership) return <>{children}</>;

  const overdue = await overdueInvoices(workspaceId);
  if (overdue.length === 0) return <>{children}</>;

  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
  return (
    <SuspendedNotice
      t={t}
      locale={locale}
      workspaceId={workspaceId}
      isAdmin={isAdmin}
      invoices={overdue}
    />
  );
}
