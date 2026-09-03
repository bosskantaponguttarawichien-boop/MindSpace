"use client";

import { AlertCircle, ChevronDown, Check, Cloud, Copy, FileDown, FolderInput, LogOut, MoreHorizontal, PanelLeft, PanelLeftClose, PanelRight, PanelRightClose, Pencil, Plus, Redo2, Trash2, Undo2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n/locale-provider";
import { useState } from "react";
import type { BoardEngine } from "@/infrastructure/board-engine/board-engine";
import { LanguageSwitcher } from "@/features/workspace/components/language-switcher";
import type { BoardSyncStatus } from "@/features/workspace/hooks/use-persisted-boards";
import type { Account } from "@/domain/auth/account";

type BoardSummary = { id: string; name: string };

export function WorkspaceTopbar({
  engine,
  boardName,
  boards,
  activeBoardId,
  nextBoardName,
  syncStatus,
  syncError,
  sidebarOpen = true,
  rightPanelOpen = true,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard,
  onSelectBoard,
  onExportPdf,
  onToggleSidebar,
  onToggleRightPanel,
  accountLabel,
  onOpenAccount,
  account,
  onSignOut,
}: {
  engine: BoardEngine | null;
  boardName: string;
  boards: BoardSummary[];
  activeBoardId: string;
  nextBoardName: string;
  syncStatus: BoardSyncStatus;
  syncError: string | null;
  sidebarOpen?: boolean;
  rightPanelOpen?: boolean;
  onCreateBoard: (name: string) => void;
  onRenameBoard?: (id: string, name: string) => void;
  onDeleteBoard?: (id: string) => void;
  onSelectBoard: (id: string) => void;
  onExportPdf: () => void;
  onToggleSidebar?: () => void;
  onToggleRightPanel?: () => void;
  accountLabel?: string;
  onOpenAccount?: () => void;
  account?: Account | null;
  onSignOut?: () => void | Promise<void>;
}) {
  const { t, locale, setLocale } = useLocale();
  const [nameDialog, setNameDialog] = useState<{ board: BoardSummary | null; value: string } | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<BoardSummary | null>(null);
  const syncLabel = {
    connecting: t("syncConnecting"),
    saving: t("syncSaving"),
    saved: t("syncSaved"),
    error: t("syncError"),
  }[syncStatus];

  const submitName = () => {
    if (!nameDialog) return;
    const trimmed = nameDialog.value.trim();
    if (!trimmed) return;
    if (nameDialog.board) {
      onRenameBoard?.(nameDialog.board.id, trimmed);
    } else {
      onCreateBoard(trimmed);
    }
    setNameDialog(null);
  };

  const confirmDelete = () => {
    if (boardToDelete) {
      onDeleteBoard?.(boardToDelete.id);
    }
    setBoardToDelete(null);
  };

  return (
    <header className="flex h-full min-w-0 items-center justify-between gap-3 bg-background px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {onToggleSidebar ? (
          <IconAction
            label={sidebarOpen ? t("collapseSidebar") : t("expandSidebar")}
            icon={sidebarOpen ? PanelLeftClose : PanelLeft}
            onClick={onToggleSidebar}
            active={sidebarOpen}
            className="hidden lg:inline-flex"
          />
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group flex min-w-0 items-center gap-1.5 rounded-lg py-1 pe-2 ps-1 text-start transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={t("switchBoard")}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h1 className="truncate text-sm font-bold">{boardName}</h1>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{t("boardSubtitle")}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-w-[90vw] p-2">
            <DropdownMenuLabel className="px-2 pb-1 text-xs text-muted-foreground font-semibold">{t("switchBoard")}</DropdownMenuLabel>
            <div className="max-h-56 overflow-y-auto space-y-0.5 py-0.5">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className="flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted text-sm group/row"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex min-w-0 flex-1 items-center gap-2 text-start focus:outline-none"
                    onClick={() => {
                      if (board.id !== activeBoardId) onSelectBoard(board.id);
                    }}
                    aria-label={`${t("switchBoard")}: ${board.name}`}
                  >
                    <span className="truncate font-medium">{board.name}</span>
                    {board.id === activeBoardId ? <Check className="size-4 shrink-0 text-primary" /> : null}
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {onRenameBoard ? (
                      <button
                        type="button"
                        className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted-foreground/10 transition-colors"
                        aria-label={`${t("renameBoard")}: ${board.name}`}
                        title={t("renameBoard")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNameDialog({ board, value: board.name });
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    ) : null}
                    {onDeleteBoard ? (
                      <button
                        type="button"
                        className="p-1 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                        aria-label={`${t("deleteBoard")}: ${board.name}`}
                        title={t("deleteBoard")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBoardToDelete(board);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setNameDialog({ board: null, value: nextBoardName })} className="font-medium text-primary">
              <Plus className="size-4" />
              {t("newBoard")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="outline" className="me-1 flex shrink-0 gap-1 px-2 text-[10px] sm:gap-1.5 sm:text-xs" title={syncError ?? syncLabel}>
          {syncStatus === "error" ? <AlertCircle className="size-3.5 text-destructive" /> : <Cloud className="size-3.5" />} {syncLabel}
        </Badge>
        <IconAction label={t("undo")} icon={Undo2} shortcut="⌘ Z" disabled={!engine} onClick={() => engine?.undo()} />
        <IconAction label={t("redo")} icon={Redo2} shortcut="⇧ ⌘ Z" disabled={!engine} onClick={() => engine?.redo()} />
        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("boardActions")}><MoreHorizontal className="size-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {account && !account.isAnonymous ? (
                <>
                  <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground select-none">
                    <UserRound className="size-4 shrink-0" />
                    <span className="truncate font-medium text-foreground">{account.email}</span>
                  </div>
                  <DropdownMenuSeparator />
                </>
              ) : onOpenAccount ? (
                <>
                  <DropdownMenuItem onSelect={onOpenAccount}>
                    <UserRound className="size-4" />
                    {accountLabel ?? t("account")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onSelect={() => engine?.duplicateSelection()}><Copy />{t("duplicate")}</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => engine?.deleteSelection()}><Trash2 />{t("delete")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled><FolderInput />{t("import")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onExportPdf}><FileDown />{t("exportPdf")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setLocale("en")}><span className="flex-1">{t("english")}</span>{locale === "en" ? <Check /> : null}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocale("th")}><span className="flex-1">{t("thai")}</span>{locale === "th" ? <Check /> : null}</DropdownMenuItem>
              {account && !account.isAnonymous && onSignOut ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      void onSignOut();
                    }}
                  >
                    <LogOut className="size-4" />
                    {t("signOut")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <IconAction label={t("duplicate")} icon={Copy} disabled={!engine} onClick={() => engine?.duplicateSelection()} className="hidden sm:inline-flex" />
        <IconAction label={t("delete")} icon={Trash2} disabled={!engine} onClick={() => engine?.deleteSelection()} className="hidden sm:inline-flex" />
        <Button variant="outline" size="sm" className="hidden gap-2 lg:inline-flex" disabled title={t("importImage")}><FolderInput className="size-4" />{t("import")}</Button>
        <Button variant="outline" size="sm" className="hidden gap-2 lg:inline-flex" disabled={!engine} onClick={onExportPdf}><FileDown className="size-4" />{t("exportPdf")}</Button>
        {onOpenAccount ? <Button variant="outline" size="sm" className="hidden gap-2 lg:inline-flex" onClick={onOpenAccount}><UserRound className="size-4" />{accountLabel ?? t("account")}</Button> : null}
        <div className="hidden sm:block"><LanguageSwitcher /></div>
        {onToggleRightPanel ? (
          <IconAction
            label={rightPanelOpen ? t("collapseAiPanel") : t("expandAiPanel")}
            icon={rightPanelOpen ? PanelRightClose : PanelRight}
            onClick={onToggleRightPanel}
            active={rightPanelOpen}
            className="hidden lg:inline-flex"
          />
        ) : null}
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
    </header>
  );
}
