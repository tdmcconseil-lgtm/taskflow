"use client";

import { useTransition } from "react";
import { setMemberRole, setMemberActive } from "@/lib/actions/workspaces";

export function MemberControls({
  workspaceId,
  memberUserId,
  role,
  deactivated,
}: {
  workspaceId: string;
  memberUserId: string;
  role: "ADMIN" | "MEMBER";
  deactivated: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={role}
        disabled={pending}
        onChange={(e) =>
          start(() =>
            setMemberRole(workspaceId, memberUserId, e.target.value as "ADMIN" | "MEMBER"),
          )
        }
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="MEMBER">Utilisateur</option>
        <option value="ADMIN">Administrateur</option>
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => setMemberActive(workspaceId, memberUserId, deactivated))}
        className={`rounded-md border px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
          deactivated
            ? "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/40"
            : "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
        }`}
      >
        {deactivated ? "Réactiver" : "Désactiver"}
      </button>
    </div>
  );
}
