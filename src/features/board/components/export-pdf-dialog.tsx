"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BoardExport } from "@/infrastructure/board-engine/board-engine";

/** Prints through a same-origin iframe because pop-up windows are blocked or returned as null. */
function printPage(preview: BoardExport) {
  const frame = window.document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  window.document.body.append(frame);
  const frameDocument = frame.contentDocument;
  const frameWindow = frame.contentWindow;
  if (!frameDocument || !frameWindow) {
    frame.remove();
    return;
  }
  frameDocument.open();
  frameDocument.write(`<!doctype html><html><head><title>MindSpace</title><style>@page{size:${preview.width}px ${preview.height}px;margin:0}html,body{margin:0;padding:0}img{display:block;width:100%}</style></head><body><img alt="" src="${preview.dataUrl}"></body></html>`);
  frameDocument.close();
  const cleanup = () => frame.remove();
  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 120_000);
  const print = () => {
    frameWindow.focus();
    frameWindow.print();
  };
  const image = frameDocument.images[0];
  if (!image || image.complete) return print();
  image.addEventListener("load", print, { once: true });
  image.addEventListener("error", print, { once: true });
}

export function ExportPdfDialog({ preview, onClose }: { preview: BoardExport | null; onClose: () => void }) {
  const { t } = useLocale();
  return (
    <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[min(56rem,calc(100vw-1.5rem))]">
        <DialogHeader>
          <DialogTitle>{t("exportPdf")}</DialogTitle>
          <DialogDescription>{t("exportPreviewDescription")}</DialogDescription>
        </DialogHeader>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a canvas data URL cannot go through the image optimizer
          <img alt={t("exportPreviewAlt")} src={preview.dataUrl} className="max-h-[55vh] w-full rounded-lg border border-border bg-white object-contain" />
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>{t("cancel")}</Button>
          <Button type="button" size="lg" onClick={() => { if (preview) printPage(preview); onClose(); }}>{t("exportPdf")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
