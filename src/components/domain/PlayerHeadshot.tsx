"use client";

import Image from "next/image";
import { useState } from "react";
import { blankPlayerHeadshotUrl } from "@/lib/playerImages";

export function PlayerHeadshot({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!src || src === blankPlayerHeadshotUrl);

  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 sm:h-28 sm:w-28">
      {!failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 640px) 112px, 96px"
          className={`object-contain object-bottom p-1 transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          priority={priority}
          unoptimized
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div aria-label="Player photo unavailable" role="img" className="h-full w-full" />
      )}
    </div>
  );
}
