import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { WorkspaceForm } from "@/components/WorkspaceForm";
import { cardClass } from "@/components/ui";

export default async function NewWorkspacePage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/app" className="text-sm text-zinc-500 hover:underline">
          ← Accueil
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nouvel espace de travail</h1>
      </div>
      <div className={cardClass}>
        <WorkspaceForm />
      </div>
    </div>
  );
}
