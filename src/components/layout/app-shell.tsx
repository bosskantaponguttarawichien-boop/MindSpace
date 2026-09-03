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
    <main className="flex h-dvh min-h-0 w-full overflow-hidden bg-background sm:min-h-[620px]">
      <div
        className={cn(
          "h-full shrink-0 border-e border-border transition-[width,opacity] duration-200 ease-in-out max-lg:hidden",
          sidebarOpen ? "w-[240px] opacity-100" : "w-0 overflow-hidden border-none opacity-0"
        )}
      >
        <div className="h-full w-[240px]">{sidebar}</div>
      </div>
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="h-16 shrink-0 border-b border-border">{topbar}</div>
        <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{board}</section>
      </div>
      <div
        className={cn(
          "h-full shrink-0 border-s border-border transition-[width,opacity] duration-200 ease-in-out max-lg:hidden",
          rightPanelOpen ? "w-[300px] xl:w-[320px] opacity-100" : "w-0 overflow-hidden border-none opacity-0"
        )}
      >
        <div className="h-full w-[300px] xl:w-[320px]">{rightPanel}</div>
      </div>
    </main>
  );
}

