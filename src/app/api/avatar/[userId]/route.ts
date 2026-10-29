import { prisma } from "@/lib/prisma";

const COLORS = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#db2777", "#7c3aed"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function initialsSvg(name: string, seed: string): string {
  const bg = colorFor(seed);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="${bg}"/><text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="600" fill="#fff">${initials(name)}</text></svg>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, photoData: true, photoMime: true },
  });

  if (user?.photoData && user.photoMime) {
    return new Response(new Uint8Array(user.photoData), {
      headers: { "Content-Type": user.photoMime, "Cache-Control": "private, max-age=60" },
    });
  }

  const svg = initialsSvg(user?.name ?? "?", userId);
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=60" },
  });
}
