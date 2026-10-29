import type { CSSProperties } from "react";

// Cadrage d'avatar par POINT FOCAL, non destructif et indépendant de la taille
// d'affichage (le même (fx, fy, zoom) rend pareil dans un rond de 28 px ou de
// 176 px). fx/fy ∈ [0,100] désignent le point de l'image amené au centre du
// rond ; zoom ∈ [100, …] agrandit au-delà du « cover ».

export function focalBounds(boxSize: number, nw: number, nh: number, zoom: number) {
  const cover = boxSize / Math.min(nw, nh);
  const k = cover * (zoom / 100);
  const dw = nw * k;
  const dh = nh * k;
  const Lx = (50 * boxSize) / dw;
  const Ly = (50 * boxSize) / dh;
  return { k, dw, dh, Lx, Ly };
}

export function clampFocal(
  boxSize: number,
  nw: number,
  nh: number,
  zoom: number,
  fx: number,
  fy: number,
) {
  const { Lx, Ly } = focalBounds(boxSize, nw, nh, zoom);
  return {
    fx: Math.min(100 - Lx, Math.max(Lx, fx)),
    fy: Math.min(100 - Ly, Math.max(Ly, fy)),
  };
}

// Style de l'<img> (position absolue) pour un rond de côté boxSize.
export function framedImageStyle(
  boxSize: number,
  nw: number,
  nh: number,
  fx: number,
  fy: number,
  zoom: number,
): CSSProperties {
  if (!boxSize || !nw || !nh) return { visibility: "hidden" };
  const { k, dw, dh, Lx, Ly } = focalBounds(boxSize, nw, nh, zoom);
  const cfx = Math.min(100 - Lx, Math.max(Lx, fx));
  const cfy = Math.min(100 - Ly, Math.max(Ly, fy));
  return {
    position: "absolute",
    width: `${dw}px`,
    height: `${dh}px`,
    maxWidth: "none",
    left: `${boxSize / 2 - (cfx / 100) * nw * k}px`,
    top: `${boxSize / 2 - (cfy / 100) * nh * k}px`,
  };
}
