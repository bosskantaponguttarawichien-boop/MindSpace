"use client";

import { type ReactNode, useEffect, useState } from "react";
import { IconAction, SubToolContext } from "@/components/ui/icon-action";
import { Separator } from "@/components/ui/separator";
import { BOARD_COLORS, type BoardColor } from "@/domain/board/board-document";
import { colorClasses, colorLabels, type ConnectionOption } from "@/features/board/components/toolbar-groups";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function ToolCard({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex max-w-[calc(100vw-1rem)] items-center gap-1.5 overflow-x-auto rounded-2xl border border-border bg-background/95 p-2.5 shadow-lg backdrop-blur scrollbar-none animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 ease-out sm:max-w-full sm:rounded-xl sm:p-2",
        "[&_button[aria-pressed='true']]:bg-primary [&_button[aria-pressed='true']]:text-primary-foreground [&_button[aria-pressed='true']:hover]:bg-primary/90",
        className
      )}
      role="group"
      aria-label={label}
    >
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

/** A smoothly expanding and collapsing horizontal container for SubToolGroup. */
export function CollapsibleSubTools({ open, children }: { open: boolean; children: ReactNode }) {
  const [prevOpen, setPrevOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  const [displayChildren, setDisplayChildren] = useState<ReactNode>(open ? children : null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setClosing(false);
      setDisplayChildren(children);
    } else {
      setClosing(true);
    }
  }

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      setClosing(false);
      setDisplayChildren(null);
    }, 280);
    return () => clearTimeout(timer);
  }, [closing]);

  if (!open && !closing && !displayChildren) return null;

  return (
    <div
      aria-hidden={closing ? "true" : undefined}
      className={cn(
        "shrink-0 overflow-hidden",
        closing ? "animate-subtools-out pointer-events-none" : "animate-subtools-in"
      )}
    >
      {open ? children : displayChildren}
    </div>
  );
}

/** A tinted cluster of sub-tool buttons, inserted inline into the toolbar row right after the tool that owns them. */
export function SubToolGroup({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <SubToolContext.Provider value={true}>
      <div
        className={cn(
          "flex h-9 shrink-0 items-center gap-0.5 rounded-full p-0.5 border shadow-xs transition-colors",
          "bg-primary/10 border-primary/20",
          "[&_button]:!size-8 [&_button]:shrink-0",
          "[&_button]:text-primary/90 dark:[&_button]:text-primary",
          "[&_button:hover]:bg-primary/15 [&_button:hover]:text-primary",
          "[&_button[aria-pressed='true']]:bg-primary [&_button[aria-pressed='true']]:text-primary-foreground [&_button[aria-pressed='true']:hover]:bg-primary/90",
          "[&_button[aria-expanded='true']]:bg-primary [&_button[aria-expanded='true']]:text-primary-foreground [&_button[aria-expanded='true']:hover]:bg-primary/90",
          className
        )}
      >
        {children}
      </div>
    </SubToolContext.Provider>
  );
}

export function OptionRow<TValue extends string>({ label, options, value, disabled, onSelect }: { label?: string; options: ConnectionOption<TValue>[]; value?: TValue; disabled?: boolean; onSelect: (value: TValue) => void }) {
  const { t } = useLocale();
  return (
    <ToolCardRow className="w-full shrink-0 overflow-x-auto touch-pan-x scrollbar-none sm:w-auto">
      {label ? <ToolCardLabel>{label}</ToolCardLabel> : null}
      {options.map((option) => (
        <IconAction key={option.value} label={t(option.label)} icon={option.icon} active={value === option.value} disabled={disabled} className="max-sm:size-10" onClick={() => onSelect(option.value)} />
      ))}
    </ToolCardRow>
  );
}

export function ColorRow({ label, disabled, onSelect }: { label?: string; disabled?: boolean; onSelect: (color: BoardColor) => void }) {
  const { t } = useLocale();
  return (
    <ToolCardRow className="w-full min-w-0 overflow-x-auto touch-pan-x scrollbar-none">
      {label ? <ToolCardLabel>{label}</ToolCardLabel> : null}
      {BOARD_COLORS.map((color) => (
        <button key={color} type="button" aria-label={t(colorLabels[color])} title={t(colorLabels[color])} disabled={disabled} className={cn("size-8 shrink-0 rounded-full ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 max-sm:size-10", colorClasses[color])} onClick={() => onSelect(color)} />
      ))}
    </ToolCardRow>
  );
}
