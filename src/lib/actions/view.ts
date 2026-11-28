"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseStructureDepth } from "@/lib/structure-depth";

// Mémorise la préférence Liste / Tableau (cookie) puis revient à la page
// courante. Le choix est ainsi conservé en changeant de page.
export async function setTaskView(formData: FormData): Promise<void> {
  const raw = formData.get("view");
  const view =
    raw === "liste"
      ? "liste"
      : raw === "arborescence"
        ? "arborescence"
        : raw === "structure"
          ? "structure"
          : "tableau";
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

// Mémorise la profondeur de la vue Structure (cookie tf_niveaux : un nombre de
// niveaux, ou « tous »), mêmes options que tf_vue, puis revient à la page courante.
export async function setStructureDepth(formData: FormData): Promise<void> {
  const depth = parseStructureDepth(String(formData.get("depth") ?? ""));
  const back = String(formData.get("back") ?? "/app");

  const store = await cookies();
  store.set("tf_niveaux", String(depth), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  redirect(back.startsWith("/app") ? back : "/app");
}
