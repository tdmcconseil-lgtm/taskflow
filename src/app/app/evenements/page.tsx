import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { getEventFeed } from "@/lib/events";
import { MarkEventsRead } from "@/components/MarkEventsRead";
import { EventFilter } from "@/components/EventFilter";
import { EventList } from "@/components/EventList";

export const metadata: Metadata = { title: "Événements — Taskflow" };

export default async function EvenementsPage({
  searchParams,
}: PageProps<"/app/evenements">) {
  const user = await requireUser();
  const sp = await searchParams;
  const includeOwn = sp.mine === "1";
  const groups = await getEventFeed(user.id, user.eventsReadAt ?? null, includeOwn);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MarkEventsRead />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Événements</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Les changements récents survenus sur les tâches que vous suivez (★), du plus
          récent au plus ancien. Suivez une tâche pour voir ses mises à jour apparaître ici.
        </p>
        <div className="mt-3">
          <EventFilter hideMine={!includeOwn} />
        </div>
      </div>

      <EventList
        groups={groups}
        emptyLabel="Aucun événement pour le moment. Suivez une tâche pour être informé de ses changements."
      />
    </div>
  );
}
