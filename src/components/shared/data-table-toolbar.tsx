"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterOptions?: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
  }[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string | undefined) => void;
}

export function DataTableToolbar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filterOptions = [],
  activeFilters = {},
  onFilterChange,
}: DataTableToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  const clearFilters = () => {
    filterOptions.forEach((filter) => {
      onFilterChange?.(filter.value, undefined);
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 pl-9 bg-background"
        />
      </div>

      <div className="flex items-center gap-2">
        {filterOptions.length > 0 && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={clearFilters}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                {filterOptions.map((filter) => (
                  <div key={filter.value} className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {filter.label}
                    </label>
                    <Select
                      value={activeFilters[filter.value] || ""}
                      onValueChange={(value) =>
                        onFilterChange?.(filter.value, value || undefined)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={`Select ${filter.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {activeFilterCount > 0 && (
          <div className="hidden sm:flex items-center gap-2">
            {Object.entries(activeFilters).map(([key, value]) => {
              if (!value) return null;
              const filterOption = filterOptions.find((f) => f.value === key);
              const option = filterOption?.options.find(
                (o) => o.value === value
              );
              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className="h-7 gap-1 pr-1"
                >
                  {option?.label || value}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 hover:bg-transparent"
                    onClick={() => onFilterChange?.(key, undefined)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
