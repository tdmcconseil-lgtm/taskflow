"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markRead } from "@/lib/actions/discussion";

// À l'ouverture d'une tâche, marque sa discussion comme lue (si on la suit),
// puis rafraîchit pour mettre à jour le badge de non-lus.
export function MarkDiscussionRead({ taskId }: { taskId: string }) {
  const router = useRouter();
  useEffect(() => {
    markRead(taskId).then(() => router.refresh());
  }, [taskId, router]);
  return null;
}
