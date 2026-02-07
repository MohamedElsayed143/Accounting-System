import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

type Status = "paid" | "unpaid" | "overdue" | "partial";

interface StatusBadgeProps {
  status: Status;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<Status, { 
  label: string; 
  className: string;
  icon: React.ReactNode;
}> = {
  paid: {
    label: "مدفوعة",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  unpaid: {
    label: "غير مدفوعة",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  overdue: {
    label: "متأخرة",
    className: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  partial: {
    label: "مدفوعة جزئياً",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "font-semibold border shadow-sm transition-all hover:shadow-md",
        showIcon && "gap-1.5 pl-2.5 pr-2",
        !showIcon && "px-3",
        config.className, 
        className
      )}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}

// Component for displaying multiple statuses with descriptions
interface StatusLegendProps {
  className?: string;
}

export function StatusLegend({ className }: StatusLegendProps) {
  const statuses: Status[] = ["paid", "unpaid", "overdue", "partial"];

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {statuses.map((status) => (
        <div key={status} className="flex items-center gap-2">
          <StatusBadge status={status} showIcon={true} />
        </div>
      ))}
    </div>
  );
}

// Component for status with count
interface StatusWithCountProps {
  status: Status;
  count: number;
  className?: string;
}

export function StatusWithCount({ status, count, className }: StatusWithCountProps) {
  const config = statusConfig[status];

  return (
    <div 
      className={cn(
        "flex items-center gap-2 rounded-lg border p-3 transition-all hover:shadow-md",
        config.className.replace('bg-', 'border-').replace('100', '200'),
        className
      )}
    >
      <div className={cn(
        "rounded-full p-2",
        config.className.split(' ')[0]
      )}>
        {config.icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{config.label}</span>
        <span className="text-2xl font-bold">{count.toLocaleString('ar-SA')}</span>
      </div>
    </div>
  );
}