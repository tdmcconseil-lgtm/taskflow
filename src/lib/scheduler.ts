// Scheduler interne des notifications, armé une seule fois au démarrage du
// serveur (via src/instrumentation.ts). Le conteneur Node reste actif, donc
// deux setInterval suffisent — pas de file externe à opérer.
//   - drain instantané : vide l'outbox toutes les ~30 s ;
//   - digest           : passe horaire qui envoie les récapitulatifs dus.
//
// Instance unique : ces intervalles ne doivent tourner que sur UNE réplique. Si
// l'app passe à plusieurs répliques, il faudra un verrou (sinon doubles envois).
// Désactivable avec NOTIFY_SCHEDULER=off.

import { drainInstant, runDigests } from "@/lib/notify-dispatch";

const globalForScheduler = globalThis as unknown as { notifySchedulerStarted?: boolean };

export function startScheduler(): void {
  if (process.env.NOTIFY_SCHEDULER === "off") return;
  if (globalForScheduler.notifySchedulerStarted) return;
  globalForScheduler.notifySchedulerStarted = true;

  const instantMs = Number.parseInt(process.env.NOTIFY_DRAIN_MS ?? String(30 * 1000), 10);
  const digestMs = Number.parseInt(
    process.env.NOTIFY_DIGEST_INTERVAL_MS ?? String(60 * 60 * 1000),
    10,
  );

  setInterval(() => {
    drainInstant().catch((err) => console.error("[notify] drainInstant", err));
  }, instantMs);

  setInterval(() => {
    runDigests().catch((err) => console.error("[notify] runDigests", err));
  }, digestMs);

  console.log(
    `[notify] scheduler démarré (drain ${instantMs} ms, digest ${digestMs} ms)`,
  );
}
