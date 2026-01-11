import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ExpandablePanelProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  headerClassName?: string;
  badge?: string;
  badgeStatus?: "success" | "warning" | "danger" | "neutral";
}

export function ExpandablePanel({
  title,
  subtitle,
  icon,
  children,
  defaultExpanded = true,
  className,
  headerClassName,
  badge,
  badgeStatus = "neutral",
}: ExpandablePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  const badgeColors = {
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
    danger: "bg-destructive/20 text-destructive",
    neutral: "bg-primary/20 text-primary",
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("glass-card", className)}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors",
            headerClassName
          )}
        >
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {badge && (
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                badgeColors[badgeStatus]
              )}>
                {badge}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-0">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}