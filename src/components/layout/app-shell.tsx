import { cn } from "@/lib/utils";

export function AppShell({
  sidebar,
  topbar,
  board,
  rightPanel,
  sidebarOpen = true,
  rightPanelOpen = true,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  board: React.ReactNode;
  rightPanel: React.ReactNode;
  sidebarOpen?: boolean;
  rightPanelOpen?: boolean;
}) {
  return (
    // The shell spans the whole screen including the safe areas: the board must
    // bleed edge to edge. Chrome that surrounds it carries the insets instead.
    <main className="flex h-dvh min-h-0 w-full overflow-hidden bg-background sm:min-h-[620px]">
      <div
        className={cn(
          "h-full shrink-0 border-e border-border bg-sidebar transition-[width,opacity] duration-200 ease-in-out max-lg:hidden",
          sidebarOpen ? "w-[240px] opacity-100" : "w-0 overflow-hidden border-none opacity-0"
        )}
      >
        <div className="h-full w-[240px] pb-[var(--safe-bottom)] ps-[var(--safe-left)]">{sidebar}</div>
      </div>
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Grows by the top inset so the bar's background sits under the status
            bar while its content stays below it. */}
        <div className="h-[calc(4rem+var(--safe-top))] shrink-0 border-b border-border pt-[var(--safe-top)] ps-[var(--safe-left)] pe-[var(--safe-right)] lg:ps-0 lg:pe-0">
          {topbar}
        </div>
        <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{board}</section>
      </div>
      <div
        className={cn(
          "h-full shrink-0 border-s border-border bg-background transition-[width,opacity] duration-200 ease-in-out max-lg:hidden",
          rightPanelOpen ? "w-[300px] xl:w-[320px] opacity-100" : "w-0 overflow-hidden border-none opacity-0"
        )}
      >
        <div className="h-full w-[300px] pb-[var(--safe-bottom)] pe-[var(--safe-right)] xl:w-[320px]">{rightPanel}</div>
      </div>
    </main>
  );
}
