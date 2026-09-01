"use client";

import { AlertCircle, Bot, Check, Cloud, Copy, FileDown, FolderInput, Link, MoreHorizontal, Redo2, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/locale-provider";
import { useState } from "react";
import type { BoardEngine } from "@/infrastructure/board-engine/board-engine";
import { LanguageSwitcher } from "@/features/workspace/components/language-switcher";
import type { BoardSyncStatus } from "@/features/workspace/hooks/use-persisted-boards";

export function WorkspaceTopbar({ engine, boardName, syncStatus, syncError, onCopySyncLink, onOpenAi }: { engine: BoardEngine | null; boardName: string; syncStatus: BoardSyncStatus; syncError: string | null; onCopySyncLink: () => Promise<void>; onOpenAi: () => void }) {
  const { t, locale, setLocale } = useLocale();
  const [copied, setCopied] = useState(false);
  const syncLabel = {
    connecting: t("syncConnecting"),
    saving: t("syncSaving"),
    saved: t("syncSaved"),
    error: t("syncError"),
  }[syncStatus];
  const copyLink = async () => {
    await onCopySyncLink();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <header className="flex h-full min-w-0 items-center justify-between gap-3 bg-background px-4 sm:px-5">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold">{boardName}</h1>
        <p className="truncate text-[11px] text-muted-foreground">{t("boardSubtitle")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="outline" className="me-1 flex shrink-0 gap-1 px-2 text-[10px] sm:gap-1.5 sm:text-xs" title={syncError ?? syncLabel}>
          {syncStatus === "error" ? <AlertCircle className="size-3.5 text-destructive" /> : <Cloud className="size-3.5" />} {syncLabel}
        </Badge>
        <IconAction label={t("undo")} icon={Undo2} shortcut="⌘ Z" disabled={!engine} onClick={() => engine?.undo()} />
        <IconAction label={t("redo")} icon={Redo2} shortcut="⇧ ⌘ Z" disabled={!engine} onClick={() => engine?.redo()} />
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More board actions" disabled={!engine}><MoreHorizontal className="size-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem onSelect={onOpenAi}><Bot />{t("boardAi")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copyLink()}>{copied ? <Check /> : <Link />}{copied ? t("syncLinkCopied") : t("copySyncLink")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => engine?.duplicateSelection()}><Copy />{t("duplicate")}</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => engine?.deleteSelection()}><Trash2 />{t("delete")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled><FolderInput />{t("import")}</DropdownMenuItem>
              <DropdownMenuItem disabled><FileDown />{t("exportPdf")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setLocale("en")}><span className="flex-1">{t("english")}</span>{locale === "en" ? <Check /> : null}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocale("th")}><span className="flex-1">{t("thai")}</span>{locale === "th" ? <Check /> : null}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <IconAction label={t("duplicate")} icon={Copy} disabled={!engine} onClick={() => engine?.duplicateSelection()} className="hidden sm:inline-flex" />
        <IconAction label={copied ? t("syncLinkCopied") : t("copySyncLink")} icon={copied ? Check : Link} onClick={() => void copyLink()} className="hidden sm:inline-flex" />
        <IconAction label={t("delete")} icon={Trash2} disabled={!engine} onClick={() => engine?.deleteSelection()} className="hidden sm:inline-flex" />
        <Button variant="outline" size="sm" className="hidden gap-2 lg:inline-flex" disabled title={t("futureFeature")}><FolderInput className="size-4" />{t("import")}</Button>
        <Button variant="outline" size="sm" className="hidden gap-2 lg:inline-flex" disabled title={t("futureFeature")}><FileDown className="size-4" />{t("exportPdf")}</Button>
        <div className="hidden sm:block"><LanguageSwitcher /></div>
      </div>
    </header>
  );
}
