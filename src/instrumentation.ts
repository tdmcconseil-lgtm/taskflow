// Exécuté une fois au démarrage de chaque instance du serveur Next (convention
// `instrumentation.ts`). On y arme le scheduler des notifications, uniquement
// dans le runtime Node (pas Edge) et via import dynamique pour ne pas charger de
// code serveur côté Edge.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
