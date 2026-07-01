import type { CSSProperties } from "react";
import Image from "next/image";

type ShotClockMarkProps = {
  className?: string;
  idPrefix?: string;
  style?: CSSProperties;
  title?: string;
};

export function ShotClockMark({ className = "", style, title }: ShotClockMarkProps) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={style}
    >
      <Image
        src="/brand/shotclock-mark.png"
        alt=""
        width={1024}
        height={1024}
        sizes="96px"
        className="h-full w-full object-contain"
      />
    </span>
  );
}
