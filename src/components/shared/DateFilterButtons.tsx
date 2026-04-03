import { Button } from "@/components/ui/button";

interface DateFilterButtonsProps {
  filter: "today" | "week" | "month" | "year" | "all";
  onFilterChange: (filter: "today" | "week" | "month" | "year" | "all") => void;
}

export function DateFilterButtons({ filter, onFilterChange }: DateFilterButtonsProps) {
  const options: { label: string; value: "today" | "week" | "month" | "year" | "all" }[] = [
    { label: "اليوم", value: "today" },
    { label: "هذا الأسبوع", value: "week" },
    { label: "هذا الشهر", value: "month" },
    { label: "هذا العام", value: "year" },
    { label: "الكل", value: "all" },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0" dir="rtl">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={filter === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(option.value)}
          className={`font-medium transition-colors ${
            filter === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "hover:bg-muted"
          }`}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
