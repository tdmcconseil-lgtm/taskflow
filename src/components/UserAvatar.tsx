"use client";

import { FramedAvatar } from "@/components/FramedAvatar";
import type { AssigneeInfo } from "@/lib/task-tree";

// Miniature d'un utilisateur (photo cadrée, ou initiale par défaut).
export function UserAvatar({
  user,
  className = "h-5 w-5",
}: {
  user: AssigneeInfo;
  className?: string;
}) {
  return (
    <FramedAvatar
      src={`/api/avatar/${user.id}?v=${user.version}`}
      fx={user.photoX}
      fy={user.photoY}
      zoom={user.photoZoom}
      fallback={user.name.trim()[0]?.toUpperCase() ?? "?"}
      className={`shrink-0 rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 dark:bg-zinc-700 ${className}`}
    />
  );
}
