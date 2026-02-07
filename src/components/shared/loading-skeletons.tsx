import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 5, rows = 5 }: TableSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i} className="text-right">
              <Skeleton className="h-4 w-24 bg-muted/50" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="hover:bg-muted/20">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton 
                  className="h-4 w-full max-w-[150px] bg-muted/50" 
                  style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 bg-muted/50" />
        <Skeleton className="h-10 w-10 rounded-xl bg-muted/50" />
      </div>
      <Skeleton className="h-8 w-32 bg-muted/50" />
      <Skeleton className="h-3 w-20 bg-muted/50" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 bg-muted/50" />
        <Skeleton className="h-10 w-32 bg-muted/50 rounded-lg" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64 bg-muted/50 rounded-full" />
        <Skeleton className="h-10 w-24 bg-muted/50 rounded-lg" />
      </div>
      <div className="rounded-xl border shadow-sm">
        <TableSkeleton />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40 bg-muted/50" />
        <Skeleton className="h-4 w-32 bg-muted/50" />
      </div>
      <div className="h-[300px] flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 bg-muted/50 rounded-t-lg" 
            style={{ 
              height: `${Math.random() * 80 + 20}%`,
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
      
      {/* Table */}
      <div className="rounded-xl border shadow-sm">
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-32 bg-muted/50" />
        </div>
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}