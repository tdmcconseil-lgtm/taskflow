import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { cardClass } from "@/components/ui";
import { IdeaForm } from "@/components/IdeaForm";

export const metadata: Metadata = { title: "Nouvelle idée — getRIDA" };

// Création d'une idée sur sa propre page dédiée (« une création = une page »).
// Si l'utilisateur n'a pas encore de pseudo, le formulaire en demande un.
export default async function NewIdeaPage() {
  const user = await requireUser();
  const t = await getDictionary();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pseudo: true },
  });
  const pseudo = dbUser?.pseudo ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/app/idees" className="hover:underline">
            {t.ideas.title}
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">›</span>
          <span className="text-zinc-700 dark:text-zinc-300">{t.ideas.new}</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.ideas.new}</h1>
      </div>
      <div className={cardClass}>
        <IdeaForm pseudo={pseudo} />
      </div>
    </div>
  );
}
