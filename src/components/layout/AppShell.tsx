import { BackToTopButton } from "@/components/layout/BackToTopButton";
import { TopNav } from "@/components/layout/TopNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-6">{children}</main>
      <BackToTopButton />
    </div>
  );
}
