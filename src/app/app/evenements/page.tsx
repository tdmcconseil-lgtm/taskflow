import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { getEventFeed } from "@/lib/events";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { MarkEventsRead } from "@/components/MarkEventsRead";
import { EventFilter } from "@/components/EventFilter";
import { EventList } from "@/components/EventList";

export const metadata: Metadata = { title: "Événements — Taskflow" };

export default async function EvenementsPage({
  searchParams,
}: PageProps<"/app/evenements">) {
  const user = await requireUser();
  const t = await getDictionary();
  const locale = await getLocale();
  const sp = await searchParams;
  const includeOwn = sp.mine === "1";
  const groups = await getEventFeed(user.id, user.eventsReadAt ?? null, t, includeOwn);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MarkEventsRead />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.events.title}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.events.desc}</p>
        <div className="mt-3">
          <EventFilter hideMine={!includeOwn} />
        </div>
      </div>

      <EventList groups={groups} emptyLabel={t.events.empty} locale={locale} />
    </div>
  );
}
