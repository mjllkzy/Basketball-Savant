import { TopNav } from "@/components/layout/TopNav";
import { ArrowUp } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-6">{children}</main>
      <a
        href="#top"
        aria-label="Back to top"
        title="Back to top"
        className="fixed bottom-4 right-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-ink text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:bottom-6 sm:right-6"
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </a>
    </div>
  );
}
