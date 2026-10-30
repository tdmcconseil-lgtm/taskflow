import { redirect } from "next/navigation";

// La gestion des membres est désormais unifiée dans l'onglet « Membres » de la
// page de l'espace. On y redirige pour éviter un écran en double.
export default async function MembersPage({
  params,
}: PageProps<"/app/workspaces/[workspaceId]/members">) {
  const { workspaceId } = await params;
  redirect(`/app/workspaces/${workspaceId}?tab=membres`);
}
