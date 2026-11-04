import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { isSuperAdmin } from "@/lib/auth/superadmin";

// Garde des pages et actions superadmin. On renvoie un 404 (et non un 403) pour
// un utilisateur connecté mais non superadmin : la console reste totalement
// invisible, sans révéler son existence. requireUser gère déjà l'absence de
// session (redirection /logout). À appeler au tout début de chaque page/action.
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdmin(user)) notFound();
  return user;
}
