import type { ReactNode } from "react";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { overdueInvoices } from "@/lib/billing/suspension";
import { SuspendedNotice } from "@/components/SuspendedNotice";

// Point d'entrée commun à toutes les pages d'un espace : applique la COUPURE
// administrative (Workspace.suspendedAt, posée par la boucle de recouvrement du
// traitement de nuit, levée seulement par le superadmin). Quand l'espace est
// suspendu, on affiche l'écran de régularisation À LA PLACE de la page demandée
// (pas de redirection, donc pas de boucle, et toutes les sous-pages sont couvertes) :
//   - administrateur → explication + factures échues à régler par virement (lecture
//     seule : pas de paiement self-service) ;
//   - membre → message « espace suspendu, un administrateur doit régulariser ».
// Un non-membre n'est pas concerné : on laisse la page gérer son propre contrôle
// d'accès (notFound).
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

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { suspendedAt: true },
  });
  if (!workspace?.suspendedAt) return <>{children}</>;

  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
  const [t, locale, overdue] = await Promise.all([
    getDictionary(),
    getLocale(),
    // Factures échues affichées (lecture seule) à l'administrateur pour régler.
    isAdmin ? overdueInvoices(workspaceId) : Promise.resolve([]),
  ]);
  return <SuspendedNotice t={t} locale={locale} isAdmin={isAdmin} invoices={overdue} />;
}
