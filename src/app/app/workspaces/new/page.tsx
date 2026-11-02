import { requireUser } from "@/lib/auth/dal";
import { WorkspaceForm } from "@/components/WorkspaceForm";
import { getDictionary } from "@/lib/i18n/server";
import { cardClass } from "@/components/ui";

export default async function NewWorkspacePage() {
  await requireUser();
  const t = await getDictionary();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.newWorkspace.title}</h1>
      </div>
      <div className={cardClass}>
        <WorkspaceForm />
      </div>
    </div>
  );
}
