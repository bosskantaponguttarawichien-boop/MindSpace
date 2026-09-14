import { createContext, useContext, type ComponentType } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const SubToolContext = createContext<boolean>(false);

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
  arrowPlacement?: "right" | "bottom";
};

export function IconAction({
  label,
  icon: Icon,
  onClick,
  active,
  disabled = false,
  className,
  shortcut,
  expandable = false,
  expanded,
  arrowPlacement: propArrowPlacement,
}: IconActionProps) {
  const isSubTool = useContext(SubToolContext);
  const arrowPlacement = propArrowPlacement ?? (isSubTool ? "bottom" : "right");
  const isSelected = active === true || (expandable && expanded === true);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isSelected ? "default" : "ghost"}
          size="icon"
          aria-label={label}
          aria-pressed={active}
          aria-expanded={expandable ? expanded === true : undefined}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "relative size-9 rounded-full text-zinc-700 transition-colors hover:bg-primary/10 hover:text-primary dark:text-zinc-300 dark:hover:bg-primary/20 dark:hover:text-primary",
            isSelected && "!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground shadow-xs aria-expanded:!bg-primary aria-expanded:!text-primary-foreground",
            className
          )}
        >
          <Icon
            className={cn(
              "size-4 transition-transform",
              expandable && (arrowPlacement === "bottom" ? "" : "-translate-x-1")
            )}
          />
          {expandable ? (
            arrowPlacement === "bottom" ? (
              <ChevronDown
                className={cn(
                  "absolute bottom-0.5 end-0.5 size-2 opacity-60 transition-all duration-200",
                  isSelected && "text-primary-foreground opacity-90",
                  expanded && "opacity-90 scale-110"
                )}
                aria-hidden="true"
              />
            ) : (
              <ChevronRight
                className={cn(
                  "absolute end-0.5 top-1/2 -translate-y-1/2 size-2 opacity-60 transition-all duration-200",
                  isSelected && "text-primary-foreground opacity-90",
                  expanded && "opacity-90 scale-110"
                )}
                aria-hidden="true"
              />
            )
          ) : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span>{label}</span>
        {shortcut ? <kbd className="ms-2 text-[10px] opacity-60">{shortcut}</kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}
