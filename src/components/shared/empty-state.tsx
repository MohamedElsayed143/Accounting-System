import { FileX2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-gradient-to-br from-primary/10 to-primary/5 p-6 mb-6 shadow-sm ring-4 ring-primary/5">
        {icon || <FileX2 className="h-10 w-10 text-primary/70" />}
      </div>
      <h3 className="text-xl font-bold bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
        {title}
      </h3>
      {description && (
        <p className="mt-3 text-sm text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button 
          onClick={action.onClick} 
          className="mt-6 shadow-md hover:shadow-lg transition-all"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}