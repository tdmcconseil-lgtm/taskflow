import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { getDiscussionRows } from "@/lib/discussions";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { DiscussionList } from "@/components/DiscussionList";

export const metadata: Metadata = { title: "Discussions — Taskflow" };

export default async function DiscussionsPage() {
  const user = await requireUser();
  const t = await getDictionary();
  const locale = await getLocale();
  const rows = await getDiscussionRows(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.discussionsPage.title}</h1>
      <DiscussionList
        rows={rows}
        emptyLabel={t.discussionsPage.empty}
        notFollowingLabel={t.workspace.notFollowing}
        locale={locale}
      />
    </div>
  );
}
