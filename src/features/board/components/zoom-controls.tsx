"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { IconAction } from "@/components/ui/icon-action";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardEngine } from "@/infrastructure/board-engine/board-engine";

export function ZoomControls({ engine }: { engine: BoardEngine | null }) {
  const { t } = useLocale();
  return (
    <div className="absolute bottom-4 start-4 z-30 flex items-center gap-0.5 rounded-xl border border-border bg-background/95 p-1 shadow-md backdrop-blur" aria-label="Zoom controls">
      <IconAction label={t("zoomOut")} icon={Minus} disabled={!engine} onClick={() => engine?.zoomOut()} />
      <IconAction label={t("fit")} icon={Maximize2} disabled={!engine} onClick={() => engine?.zoomToFit()} />
      <IconAction label={t("zoomIn")} icon={Plus} disabled={!engine} onClick={() => engine?.zoomIn()} />
    </div>
  );
}
