"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";

export function ShareUrlButton() {
  const [copied, setCopied] = useState(false);
  async function copyUrl() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button type="button" onClick={copyUrl} className="inline-flex min-h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-bold hover:bg-slate-50">
      <Link2 className="h-4 w-4" />
      {copied ? "Copied" : "Share"}
    </button>
  );
}
