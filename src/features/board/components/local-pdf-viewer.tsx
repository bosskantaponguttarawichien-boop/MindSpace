"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-provider";

export type LocalPdf = { name: string; url: string };

export function LocalPdfViewer({ pdf, onClose }: { pdf: LocalPdf; onClose: () => void }) {
  const { t } = useLocale();
  return (
    <section className="fixed inset-0 z-50 flex flex-col bg-background" aria-label={t("pdfPreview")}>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{pdf.name}</h2>
          <p className="text-xs text-muted-foreground">{t("localPdfNotice")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onClose}><X className="size-4" />{t("close")}</Button>
      </header>
      <iframe className="min-h-0 flex-1 bg-muted" src={pdf.url} title={pdf.name} />
    </section>
  );
}
