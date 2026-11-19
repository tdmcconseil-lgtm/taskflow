import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { getDiscussionRows } from "@/lib/discussions";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { DiscussionList } from "@/components/DiscussionList";
import { parseSort, sortControlProps } from "@/lib/sort";
import { SortControl } from "@/components/SortControl";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.pageTitles.discussions} — getRIDA` };
}

export default async function DiscussionsPage({
  searchParams,
}: PageProps<"/app/discussions">) {
  const user = await requireUser();
  const t = await getDictionary();
  const locale = await getLocale();
  const sp = await searchParams;
  const sort = parseSort("discussion", sp);
  const rows = await getDiscussionRows(user.id, undefined, sort);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.discussionsPage.title}</h1>
        {rows.length > 0 && <SortControl {...sortControlProps("discussion", sp, t)} />}
      </div>
      <DiscussionList
        rows={rows}
        emptyLabel={t.discussionsPage.empty}
        notFollowingLabel={t.workspace.notFollowing}
        locale={locale}
      />
    </div>
  );
}
