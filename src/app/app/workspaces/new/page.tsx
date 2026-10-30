import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { WorkspaceForm } from "@/components/WorkspaceForm";
import { getDictionary } from "@/lib/i18n/server";
import { cardClass } from "@/components/ui";

export default async function NewWorkspacePage() {
  await requireUser();
  const t = await getDictionary();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/app" className="text-sm text-zinc-500 dark:text-zinc-300 hover:underline">
          ← {t.newWorkspace.back}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.newWorkspace.title}</h1>
      </div>
      <div className={cardClass}>
        <WorkspaceForm />
      </div>
    </div>
  );
}
