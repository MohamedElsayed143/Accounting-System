"use client";

import React, { useRef } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (base64: string) => void;
  hint?: string;
  className?: string;
  compact?: boolean;
}

export function ImageUploader({
  label,
  value,
  onChange,
  hint,
  className,
  compact = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Size limit check (e.g., 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 2 ميجابايت.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleContainerClick = () => {
    inputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" /> {label}
      </label>
      
      <div
        onClick={handleContainerClick}
        className={cn(
          "relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2",
          compact ? "p-3 min-h-[100px]" : "p-5 min-h-[140px]",
          value ? "border-solid border-primary/30" : ""
        )}
      >
        {value ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={value}
              alt={label}
              className={cn(
                "object-contain rounded-lg shadow-sm border border-slate-100",
                compact ? "max-h-20" : "max-h-32"
              )}
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute -top-2 -left-2 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-lg hover:scale-110 z-10"
              title="حذف الصورة"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className={cn(
              "bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center",
              compact ? "w-10 h-10" : "w-12 h-12"
            )}>
              <Upload className={cn("text-slate-400", compact ? "w-4 h-4" : "w-5 h-5")} />
            </div>
            <div className="text-center">
              <p className={cn("font-medium text-slate-600 dark:text-slate-400", compact ? "text-xs" : "text-sm")}>
                انقر لاختيار صورة من جهازك
              </p>
              {hint && !compact && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
