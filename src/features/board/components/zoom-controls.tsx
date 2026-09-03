"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { IconAction } from "@/components/ui/icon-action";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardEngine } from "@/infrastructure/board-engine/board-engine";

export function ZoomControls({ engine }: { engine: BoardEngine | null }) {
  const { t } = useLocale();
  return (
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] start-2 z-30 flex items-center gap-0.5 rounded-xl border border-border bg-background/95 p-1 shadow-md backdrop-blur sm:bottom-4 sm:start-4" aria-label="Zoom controls">
      <IconAction label={t("zoomOut")} icon={Minus} disabled={!engine} className="max-sm:size-10" onClick={() => engine?.zoomOut()} />
      <IconAction label={t("fit")} icon={Maximize2} disabled={!engine} className="max-sm:size-10" onClick={() => engine?.zoomToFit()} />
      <IconAction label={t("zoomIn")} icon={Plus} disabled={!engine} className="max-sm:size-10" onClick={() => engine?.zoomIn()} />
    </div>
  );
}
