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
    <Card className={cn("overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border-r-4", 
      changeType === "increase" ? "border-r-emerald-500" : 
      changeType === "decrease" ? "border-r-red-500" : "border-r-primary",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
              {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
            </p>
            {change !== undefined && changeType && (
              <div className="flex items-center gap-2 pt-1">
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                  changeType === "increase"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                )}>
                  <span>
                    {changeType === "increase" ? "+" : "-"}
                    {Math.abs(change).toLocaleString('ar-SA')}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  مقارنة بالشهر الماضي
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "rounded-xl p-3 shadow-sm",
            changeType === "increase" ? "bg-emerald-100" :
            changeType === "decrease" ? "bg-red-100" : "bg-primary/10"
          )}>
            <Icon className={cn(
              "h-6 w-6",
              changeType === "increase" ? "text-emerald-600" :
              changeType === "decrease" ? "text-red-600" : "text-primary"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}