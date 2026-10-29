"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePhoto } from "@/lib/actions/profile";
import { focalBounds, framedImageStyle } from "@/lib/avatar";

type Props = {
  userId: string;
  initialHasPhoto: boolean;
  initialX: number;
  initialY: number;
  initialZoom: number;
  version: number;
  fallback: string;
};

// Réduit une image côté client à MAX px de côté et l'encode en WebP.
const MAX = 512;
async function downscale(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image illisible"));
      el.src = url;
    });
    const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", 0.85),
    );
    if (!blob) return file;
    return new File([blob], "avatar.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoCard(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean }>();

  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<File | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);

  const [fx, setFx] = useState(props.initialX);
  const [fy, setFy] = useState(props.initialY);
  const [zoom, setZoom] = useState(props.initialZoom);

  const [box, setBox] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; sfx: number; sfy: number } | null>(null);

  const src =
    localUrl ?? (props.initialHasPhoto ? `/api/avatar/${props.userId}?v=${props.version}` : null);
  const hasImage = src !== null;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!src) {
      setNat(null);
      return;
    }
    const im = imgRef.current;
    if (im && im.complete && im.naturalWidth) {
      setNat({ w: im.naturalWidth, h: im.naturalHeight });
    }
  }, [src]);

  function clampToBounds(nfx: number, nfy: number, z: number) {
    if (!nat || !box) return { fx: nfx, fy: nfy };
    const { Lx, Ly } = focalBounds(box, nat.w, nat.h, z);
    return {
      fx: Math.min(100 - Lx, Math.max(Lx, nfx)),
      fy: Math.min(100 - Ly, Math.max(Ly, nfy)),
    };
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMsg(undefined);
    try {
      const reduced = await downscale(f);
      if (localUrl) URL.revokeObjectURL(localUrl);
      setLocalUrl(URL.createObjectURL(reduced));
      setBlob(reduced);
      setNat(null);
      setFx(50);
      setFy(50);
      setZoom(100);
    } catch {
      setMsg({ error: "Impossible de lire cette image." });
    }
    e.target.value = "";
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!src) return;
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* non capturable */
    }
    drag.current = { px: e.clientX, py: e.clientY, sfx: fx, sfy: fy };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !nat || !box) return;
    const { dw, dh } = focalBounds(box, nat.w, nat.h, zoom);
    const nfx = d.sfx - ((e.clientX - d.px) / dw) * 100;
    const nfy = d.sfy - ((e.clientY - d.py) / dh) * 100;
    const c = clampToBounds(nfx, nfy, zoom);
    setFx(c.fx);
    setFy(c.fy);
  }
  function onPointerUp() {
    drag.current = null;
  }

  function onZoom(z: number) {
    setZoom(z);
    const c = clampToBounds(fx, fy, z);
    setFx(c.fx);
    setFy(c.fy);
  }

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("x", String(Math.round(fx)));
      fd.set("y", String(Math.round(fy)));
      fd.set("zoom", String(Math.round(zoom)));
      if (blob) fd.set("photo", blob, "avatar.webp");
      const res = await savePhoto(undefined, fd);
      setMsg(res);
      if (res?.ok) {
        setBlob(null);
        router.refresh();
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("removePhoto", "1");
      const res = await savePhoto(undefined, fd);
      setMsg(res);
      if (res?.ok) {
        if (localUrl) URL.revokeObjectURL(localUrl);
        setLocalUrl(null);
        setBlob(null);
        setNat(null);
        setFx(50);
        setFy(50);
        setZoom(100);
        router.refresh();
      }
    });
  }

  const dirty =
    blob !== null ||
    Math.round(fx) !== props.initialX ||
    Math.round(fy) !== props.initialY ||
    Math.round(zoom) !== props.initialZoom;

  return (
    <div className="space-y-4">
      {msg?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {msg.error}
        </p>
      )}
      {msg?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          Photo enregistrée.
        </p>
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <div
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className={`relative h-36 w-36 touch-none select-none overflow-hidden rounded-full border border-zinc-200 bg-indigo-500 dark:border-zinc-700 ${
              src ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={src}
                alt="Aperçu de la photo"
                draggable={false}
                onLoad={(e) =>
                  setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                }
                className="pointer-events-none"
                style={
                  nat ? framedImageStyle(box, nat.w, nat.h, fx, fy, zoom) : { visibility: "hidden" }
                }
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                {props.fallback}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/40" />
          </div>
          {src && (
            <p className="text-center text-xs text-zinc-500">
              Glissez la photo pour la recentrer.
            </p>
          )}
        </div>

        <div className="w-full flex-1 space-y-4">
          {src && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Zoom</span>
              <input
                type="range"
                min={100}
                max={300}
                step={2}
                value={zoom}
                onChange={(e) => onZoom(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {hasImage ? "Changer la photo" : "Choisir une photo"}
            </button>

            {hasImage && (
              <button
                type="button"
                onClick={save}
                disabled={isPending || !dirty}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            )}

            {props.initialHasPhoto && (
              <button
                type="button"
                onClick={remove}
                disabled={isPending}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                Supprimer
              </button>
            )}
          </div>

          <p className="text-xs text-zinc-500">JPEG, PNG ou WebP. 2 Mo maximum.</p>
        </div>
      </div>
    </div>
  );
}
