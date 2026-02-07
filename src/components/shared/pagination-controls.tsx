import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationControlsProps) {
  const startItem = totalItems
    ? (currentPage - 1) * (itemsPerPage || 10) + 1
    : 0;
  const endItem = totalItems
    ? Math.min(currentPage * (itemsPerPage || 10), totalItems)
    : 0;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show current page and surrounding pages
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t bg-muted/20">
      <div className="text-sm text-muted-foreground font-medium">
        {totalItems && itemsPerPage ? (
          <>
            عرض {startItem.toLocaleString('ar-SA')} إلى {endItem.toLocaleString('ar-SA')} من {totalItems.toLocaleString('ar-SA')} نتيجة
          </>
        ) : (
          <>
            صفحة {currentPage.toLocaleString('ar-SA')} من {totalPages.toLocaleString('ar-SA')}
          </>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="gap-2 hover:bg-primary/10 transition-all disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium">السابق</span>
        </Button>

        {/* Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }

            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className={`w-9 h-9 p-0 font-medium transition-all ${
                  currentPage === page 
                    ? 'shadow-md' 
                    : 'hover:bg-primary/10'
                }`}
              >
                {(page as number).toLocaleString('ar-SA')}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="gap-2 hover:bg-primary/10 transition-all disabled:opacity-50"
        >
          <span className="font-medium">التالي</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}