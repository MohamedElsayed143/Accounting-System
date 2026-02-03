import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: LucideIcon;
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  className,
}: KPICardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {change !== undefined && changeType && (
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "text-xs font-medium",
                    changeType === "increase"
                      ? "text-emerald-600"
                      : "text-red-600"
                  )}
                >
                  {changeType === "increase" ? "+" : "-"}
                  {Math.abs(change)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  vs last month
                </span>
              </div>
            )}
          </div>
          <div className="rounded-xl bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
