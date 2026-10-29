"use client";

import { useEffect, useRef, useState } from "react";
import { framedImageStyle } from "@/lib/avatar";

// Affiche une photo cadrée par point focal dans un rond, à n'importe quelle
// taille (la taille vient du parent via className). Mesure sa largeur réelle
// pour positionner l'image (WYSIWYG).
export function FramedAvatar({
  src,
  fx = 50,
  fy = 50,
  zoom = 100,
  fallback,
  className = "",
}: {
  src: string | null;
  fx?: number;
  fy?: number;
  zoom?: number;
  fallback: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState(0);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);

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
    } else {
      setNat(null);
    }
  }, [src]);

  return (
    <div ref={boxRef} className={`relative overflow-hidden ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) =>
            setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
          style={nat ? framedImageStyle(box, nat.w, nat.h, fx, fy, zoom) : { visibility: "hidden" }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{fallback}</span>
      )}
    </div>
  );
}
