"use client";

import type { ReactNode } from "react";
import { IconAction } from "@/components/ui/icon-action";
import { Separator } from "@/components/ui/separator";
import { BOARD_COLORS, type BoardColor } from "@/domain/board/board-document";
import { colorClasses, colorLabels, type ConnectionOption } from "@/features/board/components/toolbar-groups";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function ToolCard({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1.5 overflow-x-auto rounded-xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur scrollbar-none sm:max-w-full", className)} role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function ToolCardRow({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex items-center gap-1.5", className)}>{children}</div>;
}

export function ToolCardLabel({ children }: { children: ReactNode }) {
  return <span className="shrink-0 px-1 text-[11px] font-medium text-muted-foreground">{children}</span>;
}

export function ToolCardSeparator() {
  return <Separator orientation="vertical" className="mx-0.5 h-6" />;
}

export function OptionRow<TValue extends string>({ label, options, value, disabled, onSelect }: { label?: string; options: ConnectionOption<TValue>[]; value?: TValue; disabled?: boolean; onSelect: (value: TValue) => void }) {
  const { t } = useLocale();
  return (
    <ToolCardRow>
      {label ? <ToolCardLabel>{label}</ToolCardLabel> : null}
      {options.map((option) => (
        <IconAction key={option.value} label={t(option.label)} icon={option.icon} active={value === option.value} disabled={disabled} onClick={() => onSelect(option.value)} />
      ))}
    </ToolCardRow>
  );
}

export function ColorRow({ label, disabled, onSelect }: { label?: string; disabled?: boolean; onSelect: (color: BoardColor) => void }) {
  const { t } = useLocale();
  return (
    <ToolCardRow className="overflow-x-auto scrollbar-none">
      {label ? <ToolCardLabel>{label}</ToolCardLabel> : null}
      {BOARD_COLORS.map((color) => (
        <button key={color} type="button" aria-label={t(colorLabels[color])} title={t(colorLabels[color])} disabled={disabled} className={cn("size-8 shrink-0 rounded-full ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", colorClasses[color])} onClick={() => onSelect(color)} />
      ))}
    </ToolCardRow>
  );
}
