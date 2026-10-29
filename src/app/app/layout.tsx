import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/actions/auth";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: "asc" },
    include: {
      projects: { orderBy: { createdAt: "asc" }, select: { id: true, name: true } },
    },
  });

  return (
    <div className="flex min-h-full flex-1">
      {/* Barre latérale */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white p-4 md:flex dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/app" className="mb-6 block text-lg font-semibold tracking-tight">
          Taskflow
        </Link>

        <nav className="flex-1 space-y-6 overflow-y-auto">
          <Link
            href="/app"
            className="block rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            🏠 Accueil
          </Link>

          <div>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Espaces
              </span>
              <Link
                href="/app/workspaces/new"
                className="text-sm text-indigo-600 hover:underline"
                title="Nouvel espace de travail"
              >
                +
              </Link>
            </div>

            <ul className="space-y-3">
              {workspaces.map((ws) => (
                <li key={ws.id}>
                  <Link
                    href={`/app/workspaces/${ws.id}`}
                    className="block truncate rounded-lg px-2 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {ws.name}
                  </Link>
                  <ul className="mt-1 space-y-0.5 border-l border-zinc-200 pl-3 dark:border-zinc-800">
                    {ws.projects.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/app/projects/${p.id}`}
                          className="block truncate rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          {p.name}
                        </Link>
                      </li>
                    ))}
                    {ws.projects.length === 0 && (
                      <li className="px-2 py-1 text-xs italic text-zinc-400">
                        Aucun projet
                      </li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <Link href="/app" className="text-sm font-semibold md:hidden">
            Taskflow
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-zinc-500">{user.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
