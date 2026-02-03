import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "paid" | "unpaid" | "overdue" | "partial";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<
  Status,
  { label: string; className: string }
> = {
  paid: {
    label: "Paid",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  },
  unpaid: {
    label: "Unpaid",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
  partial: {
    label: "Partial",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
