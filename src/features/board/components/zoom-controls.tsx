"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import type { Editor } from "tldraw";
import { IconAction } from "@/components/ui/icon-action";
import { useLocale } from "@/lib/i18n/locale-provider";

export function ZoomControls({ editor }: { editor: Editor | null }) {
  const { t } = useLocale();
  return (
    <div className="absolute bottom-4 start-4 z-30 flex items-center gap-0.5 rounded-xl border border-border bg-background/95 p-1 shadow-md backdrop-blur" aria-label="Zoom controls">
      <IconAction label={t("zoomOut")} icon={Minus} disabled={!editor} onClick={() => editor?.zoomOut()} />
      <IconAction label={t("fit")} icon={Maximize2} disabled={!editor} onClick={() => editor?.zoomToFit({ animation: { duration: 180 } })} />
      <IconAction label={t("zoomIn")} icon={Plus} disabled={!editor} onClick={() => editor?.zoomIn()} />
    </div>
  );
}
