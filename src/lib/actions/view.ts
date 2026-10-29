"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Mémorise la préférence Liste / Tableau (cookie) puis revient à la page
// courante. Le choix est ainsi conservé en changeant de page.
export async function setTaskView(formData: FormData): Promise<void> {
  const view = formData.get("view") === "liste" ? "liste" : "tableau";
  const back = String(formData.get("back") ?? "/app");

  const store = await cookies();
  store.set("tf_vue", view, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // On ne redirige que vers une route interne de l'application.
  redirect(back.startsWith("/app") ? back : "/app");
}
