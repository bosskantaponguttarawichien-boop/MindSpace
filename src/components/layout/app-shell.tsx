export function AppShell({ sidebar, topbar, board, rightPanel }: { sidebar: React.ReactNode; topbar: React.ReactNode; board: React.ReactNode; rightPanel: React.ReactNode }) {
  return (
    <main className="grid h-dvh min-h-[620px] grid-cols-[240px_minmax(0,1fr)_300px] grid-rows-[64px_minmax(0,1fr)] overflow-hidden bg-background max-xl:grid-cols-[220px_minmax(0,1fr)] max-lg:grid-cols-1">
      <div className="row-span-2 border-e border-border max-lg:hidden">{sidebar}</div>
      <div className="col-start-2 border-b border-border max-lg:col-start-1">{topbar}</div>
      <section className="relative col-start-2 row-start-2 min-h-0 min-w-0 overflow-hidden max-lg:col-start-1">{board}</section>
      <div className="col-start-3 row-span-2 row-start-1 border-s border-border max-xl:hidden">{rightPanel}</div>
    </main>
  );
}
