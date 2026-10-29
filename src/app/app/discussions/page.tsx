import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { getDiscussionRows } from "@/lib/discussions";
import { DiscussionList } from "@/components/DiscussionList";

export const metadata: Metadata = { title: "Discussions — Taskflow" };

export default async function DiscussionsPage() {
  const user = await requireUser();
  const rows = await getDiscussionRows(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Discussions</h1>
      <DiscussionList
        rows={rows}
        emptyLabel="Aucune discussion. Suivez une tâche ou écrivez un message pour en voir apparaître ici."
      />
    </div>
  );
}
