import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const user = await requireUser();
  const { documentId } = await params;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { kind: true, url: true, data: true, mime: true, fileName: true, workspaceId: true },
  });
  if (!doc) return new Response("Introuvable", { status: 404 });
  if (!(await getMembership(user.id, doc.workspaceId))) {
    return new Response("Accès refusé", { status: 403 });
  }

  // ?dl=1 force le téléchargement ; sinon affichage dans le navigateur si possible.
  const download = new URL(req.url).searchParams.get("dl") === "1";

  // Document lien : on redirige vers l'URL externe (pas de téléchargement possible).
  if (doc.kind === "LINK") {
    if (download || !doc.url) return new Response("Introuvable", { status: 404 });
    return new Response(null, { status: 302, headers: { Location: doc.url } });
  }

  // Document fichier : le binaire est servi depuis la base.
  if (!doc.data) return new Response("Introuvable", { status: 404 });
  const disposition = download ? "attachment" : "inline";
  const safeName = (doc.fileName ?? "document").replace(/["\r\n]/g, "_");

  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mime || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
