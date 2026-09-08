"use client";

import { useState } from "react";
import Image from "next/image";
import { Cloud, MoreHorizontal, PanelLeftClose, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale } from "@/lib/i18n/locale-provider";

type BoardSummary = { id: string; name: string };
type NameDialog = { board: BoardSummary | null; value: string };

export function WorkspaceSidebar({
  boards,
  activeBoardId,
  nextBoardName,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard,
  onSelectBoard,
  onToggleSidebar,
}: {
  boards: BoardSummary[];
  activeBoardId: string;
  nextBoardName: string;
  onCreateBoard: (name: string) => void;
  onRenameBoard: (id: string, name: string) => void;
  onDeleteBoard: (id: string) => void;
  onSelectBoard: (id: string) => void;
  onToggleSidebar?: () => void;
}) {
  const { t } = useLocale();
  const [nameDialog, setNameDialog] = useState<NameDialog | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<BoardSummary | null>(null);

  const submitName = () => {
    if (!nameDialog) return;
    const name = nameDialog.value.trim();
    if (nameDialog.board) onRenameBoard(nameDialog.board.id, name || nameDialog.board.name);
    else onCreateBoard(name || nextBoardName);
    setNameDialog(null);
  };

  const confirmDelete = () => {
    if (boardToDelete) onDeleteBoard(boardToDelete.id);
    setBoardToDelete(null);
  };

  return (
    <aside className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between px-4 sm:px-5">
        <div className="flex items-center gap-3">
          <Image src="/icons/mindspace-192.png" alt="" width={32} height={32} className="size-8 rounded-xl shadow-sm" priority />
          <span className="text-[15px] font-bold tracking-tight">{t("appName")}</span>
        </div>
        {onToggleSidebar ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("collapseSidebar")}
            title={t("collapseSidebar")}
            onClick={onToggleSidebar}
          >
            <PanelLeftClose className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="px-4 pb-5">
        <Button className="w-full justify-start gap-2" onClick={() => setNameDialog({ board: null, value: nextBoardName })}>
          <Plus className="size-4" /> {t("newBoard")}
        </Button>
      </div>
      <div className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("boards")}</div>
      <ScrollArea className="min-h-0 flex-1 px-3">
        <nav aria-label={t("boards")} className="space-y-1">
          {boards.map((board) => (
            <div key={board.id} className="group/board relative">
              <button type="button" className="w-full rounded-lg py-2.5 pe-10 ps-3 text-start text-sm transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary" data-active={board.id === activeBoardId} onClick={() => onSelectBoard(board.id)}>
                <span className="block truncate">{board.name}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`${t("boardActions")}: ${board.name}`} className="absolute end-1 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover/board:opacity-100 data-[state=open]:opacity-100">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuItem onSelect={() => setNameDialog({ board, value: board.name })}><Pencil />{t("renameBoard")}</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setBoardToDelete(board)}><Trash2 />{t("deleteBoard")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </nav>
      </ScrollArea>
      <div className="m-4 rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-center gap-2 text-xs font-medium"><Cloud className="size-4 text-muted-foreground" />{t("phaseTwo")}</div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{t("syncDescription")}</p>
      </div>

      <Dialog open={nameDialog !== null} onOpenChange={(open) => { if (!open) setNameDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{nameDialog?.board ? t("renameBoard") : t("newBoard")}</DialogTitle>
            <DialogDescription>{t("boardName")}</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); submitName(); }}>
            <Input aria-label={t("boardName")} autoFocus value={nameDialog?.value ?? ""} placeholder={nextBoardName} maxLength={80} onChange={(event) => setNameDialog((current) => current ? { ...current, value: event.target.value } : current)} />
            <DialogFooter>
              <Button type="button" variant="outline" size="lg" onClick={() => setNameDialog(null)}>{t("cancel")}</Button>
              <Button type="submit" size="lg">{nameDialog?.board ? t("save") : t("create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={boardToDelete !== null} onOpenChange={(open) => { if (!open) setBoardToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteBoard")}</DialogTitle>
            <DialogDescription>“{boardToDelete?.name}” — {t("deleteBoardDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => setBoardToDelete(null)}>{t("cancel")}</Button>
            <Button type="button" variant="destructive" size="lg" onClick={confirmDelete}>{t("deleteBoard")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
