"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      const header = document.querySelector("header");
      const threshold = header instanceof HTMLElement ? header.offsetHeight : 260;
      setIsVisible(window.scrollY > threshold);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  return (
    <a
      href="#top"
      aria-label="Back to top"
      title="Back to top"
      tabIndex={isVisible ? 0 : -1}
      className={`fixed bottom-4 right-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-ink text-white shadow-lg shadow-slate-900/20 transition duration-200 hover:-translate-y-0.5 hover:bg-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:bottom-6 sm:right-6 ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </a>
  );
}
