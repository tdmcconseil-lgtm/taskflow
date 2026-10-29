"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markEventsRead } from "@/lib/actions/events";

// À l'ouverture de la page Événements, remet le compteur de non-lus à zéro.
export function MarkEventsRead() {
  const router = useRouter();
  useEffect(() => {
    markEventsRead().then(() => router.refresh());
  }, [router]);
  return null;
}
