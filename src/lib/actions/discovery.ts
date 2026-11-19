"use server";

import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { HINT_ANCHORS } from "@/lib/discovery";

// Actions du mode découverte. Elles persistent les réglages en base (synchro
// multi-appareils) ; l'affichage immédiat est piloté côté client par le
// DiscoveryProvider, donc aucune de ces actions ne revalide ni ne redirige.
// Chaque action ré-authentifie l'appelant : une action est un point d'entrée
// POST atteignable hors de l'UI (cf. node_modules/next/dist/docs, Server Actions).

// Active ou désactive le mode découverte de l'utilisateur courant.
export async function setDiscoveryMode(enabled: boolean): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { discoveryMode: !!enabled },
  });
}

// Masque définitivement une bulle d'aide (« Ne plus afficher »). L'ancre doit
// faire partie du registre connu ; on dédoublonne pour garder un ensemble propre.
export async function dismissHint(anchor: string): Promise<void> {
  const user = await requireUser();
  if (!(HINT_ANCHORS as readonly string[]).includes(anchor)) return;

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { dismissedHints: true },
  });
  const current = row?.dismissedHints ?? [];
  if (current.includes(anchor)) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { dismissedHints: [...current, anchor] },
  });
}

// Marque le tour de bienvenue comme vu (ou passé). Idempotent : ne réécrit pas
// l'horodatage s'il est déjà posé.
export async function completeTour(): Promise<void> {
  const user = await requireUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tourCompletedAt: true },
  });
  if (row?.tourCompletedAt != null) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { tourCompletedAt: new Date() },
  });
}
