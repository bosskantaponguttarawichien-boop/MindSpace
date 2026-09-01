import type { ComponentType } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconActionProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  shortcut?: string;
  expandable?: boolean;
  expanded?: boolean;
};

export function IconAction({ label, icon: Icon, onClick, active, disabled = false, className, shortcut, expandable = false, expanded }: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant={active === true ? "secondary" : "ghost"} size="icon" aria-label={label} aria-pressed={active} aria-expanded={expandable ? expanded === true : undefined} disabled={disabled} onClick={onClick} className={cn("relative size-9 rounded-lg text-muted-foreground", active === true && "bg-primary/10 text-primary", className)}>
          <Icon className="size-4" />
          {expandable ? <ChevronDown className="absolute bottom-0.5 end-0.5 size-2.5 opacity-60" aria-hidden="true" /> : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span>{label}</span>
        {shortcut ? <kbd className="ms-2 text-[10px] opacity-60">{shortcut}</kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}
