"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShotClockMark } from "@/components/brand/ShotClockMark";
import { CommandSearch } from "@/components/layout/CommandSearch";
import { coreNavLinks } from "@/lib/navigation";

const HIDE_SCROLL_Y = 120;
const SHOW_SCROLL_Y = 40;
const SCROLL_DELTA = 8;
const CONTRAST_SCROLL_Y = 24;

export function TopNav() {
  const [hidden, setHidden] = useState(false);
  const [overContent, setOverContent] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const lastScrollY = useRef(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    setOverContent(window.scrollY > CONTRAST_SCROLL_Y);

    const handleScroll = () => {
      if (frame.current !== null) return;

      frame.current = window.requestAnimationFrame(() => {
        const scrollY = Math.max(window.scrollY, 0);
        const delta = scrollY - lastScrollY.current;
        setOverContent(scrollY > CONTRAST_SCROLL_Y);

        if (scrollY <= SHOW_SCROLL_Y || interacting) {
          setHidden(false);
        } else if (scrollY > HIDE_SCROLL_Y && delta > SCROLL_DELTA) {
          setHidden(true);
        } else if (delta < -SCROLL_DELTA) {
          setHidden(false);
        }

        lastScrollY.current = scrollY;
        frame.current = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [interacting]);

  return (
    <header
      data-state={hidden ? "hidden" : "visible"}
      onFocusCapture={() => {
        setInteracting(true);
        setHidden(false);
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setInteracting(false);
      }}
      className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-[transform,opacity,box-shadow,background-color,border-color,color] duration-300 ease-out will-change-transform motion-reduce:transition-none ${
        overContent
          ? "border-white/10 bg-ink/[0.84] text-white shadow-[0_18px_55px_rgba(2,6,23,0.32)]"
          : "border-slate-200 bg-white/[0.92] text-ink shadow-sm"
      } ${
        hidden ? "pointer-events-none -translate-y-full opacity-0 shadow-none" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 px-3 py-3 sm:px-5 lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ShotClockMark className="h-10 w-10 shrink-0" idPrefix="shotclock-topnav-mark" />
            <div>
              <div className={`text-base font-black uppercase tracking-[0.18em] ${overContent ? "text-white drop-shadow-sm" : "text-ink"}`}>ShotClock</div>
              <div className={`text-xs font-medium ${overContent ? "text-slate-200" : "text-slate-500"}`}>Advanced Basketball Analytics</div>
            </div>
          </Link>
          <CommandSearch />
        </div>
        <nav className={`table-scroll flex gap-1 overflow-x-auto pb-1 text-sm font-semibold ${overContent ? "text-slate-100" : "text-slate-700"}`}>
          {coreNavLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded border px-3 transition-colors ${
                  overContent
                    ? "border-transparent hover:border-white/25 hover:bg-white/10"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
