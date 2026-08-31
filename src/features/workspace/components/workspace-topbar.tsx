"use client";

import { Copy, FileDown, FolderInput, Redo2, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardEngine } from "@/infrastructure/board-engine/board-engine";
import { LanguageSwitcher } from "@/features/workspace/components/language-switcher";

export function WorkspaceTopbar({ engine }: { engine: BoardEngine | null }) {
  const { t } = useLocale();
  return (
    <header className="flex h-full min-w-0 items-center justify-between gap-3 bg-background px-4 sm:px-5">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold">Backend Learning</h1>
        <p className="truncate text-[11px] text-muted-foreground">{t("boardSubtitle")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="outline" className="me-1 hidden gap-1.5 border-amber-200 bg-amber-50 text-amber-800 md:flex" title={t("localPrototypeHint")}>
          <span className="size-1.5 rounded-full bg-amber-500" /> {t("localPrototype")}
        </Badge>
        <IconAction label={t("undo")} icon={Undo2} shortcut="⌘ Z" disabled={!engine} onClick={() => engine?.undo()} />
        <IconAction label={t("redo")} icon={Redo2} shortcut="⇧ ⌘ Z" disabled={!engine} onClick={() => engine?.redo()} />
        <IconAction label={t("duplicate")} icon={Copy} disabled={!engine} onClick={() => engine?.duplicateSelection()} className="hidden sm:inline-flex" />
        <IconAction label={t("delete")} icon={Trash2} disabled={!engine} onClick={() => engine?.deleteSelection()} className="hidden sm:inline-flex" />
        <Button variant="outline" size="sm" className="hidden gap-2 lg:inline-flex" disabled title={t("futureFeature")}><FolderInput className="size-4" />{t("import")}</Button>
        <Button variant="outline" size="sm" className="hidden gap-2 lg:inline-flex" disabled title={t("futureFeature")}><FileDown className="size-4" />{t("exportPdf")}</Button>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
