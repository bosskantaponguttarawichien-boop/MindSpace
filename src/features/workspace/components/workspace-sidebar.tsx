"use client";

import { Cloud, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale } from "@/lib/i18n/locale-provider";

type BoardSummary = { id: string; name: string };

export function WorkspaceSidebar({ boards, activeBoardId, onCreateBoard, onSelectBoard }: { boards: BoardSummary[]; activeBoardId: string; onCreateBoard: () => void; onSelectBoard: (id: string) => void }) {
  const { t } = useLocale();
  return (
    <aside className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 px-5">
        <span className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-sm">M</span>
        <span className="text-[15px] font-bold tracking-tight">{t("appName")}</span>
      </div>
      <div className="px-4 pb-5">
        <Button className="w-full justify-start gap-2" onClick={onCreateBoard}>
          <Plus className="size-4" /> {t("newBoard")}
        </Button>
      </div>
      <div className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("boards")}</div>
      <ScrollArea className="min-h-0 flex-1 px-3">
        <nav aria-label={t("boards")} className="space-y-1">
          {boards.map((board) => (
            <button key={board.id} type="button" className="w-full rounded-lg px-3 py-2.5 text-start text-sm transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary" data-active={board.id === activeBoardId} onClick={() => onSelectBoard(board.id)}>
              {board.name}
            </button>
          ))}
        </nav>
      </ScrollArea>
      <div className="m-4 rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-center gap-2 text-xs font-medium"><Cloud className="size-4 text-muted-foreground" />{t("phaseTwo")}</div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{t("syncDescription")}</p>
      </div>
    </aside>
  );
}
