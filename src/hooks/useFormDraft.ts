import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export function useFormDraft<T>(key: string, initialData: T) {
  const [draft, setDraft] = useState<T>(initialData);
  const [isLoaded, setIsLoaded] = useState(false);
  const isSubmitting = useRef(false);

  // Load draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(`formDraft_${key}`);
      if (savedDraft) {
        setDraft(JSON.parse(savedDraft));
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
    setIsLoaded(true);
  }, [key]);

  // Save draft whenever it changes (debounced by React effect scheduling)
  useEffect(() => {
    if (!isLoaded || isSubmitting.current) return;
    
    // Only save if it's different from initial (string comparison is naive but works for standard JSON)
    const currentJson = JSON.stringify(draft);
    const initialJson = JSON.stringify(initialData);

    if (currentJson === initialJson) {
      localStorage.removeItem(`formDraft_${key}`);
    } else {
      localStorage.setItem(`formDraft_${key}`, currentJson);
    }
  }, [draft, initialData, key, isLoaded]);

  // Handle beforeunload to warn user
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting.current) return;

      const currentJson = JSON.stringify(draft);
      const initialJson = JSON.stringify(initialData);
      
      if (currentJson !== initialJson) {
        // Only warn if there are saved changes
        e.preventDefault();
        e.returnValue = "لديك بيانات غير محفوظة. هل أنت متأكد من المغادرة؟";
        return "لديك بيانات غير محفوظة. هل أنت متأكد من المغادرة؟";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draft, initialData]);

  const clearDraft = () => {
    setDraft(initialData);
    localStorage.removeItem(`formDraft_${key}`);
    toast.success("تم تصفية البيانات المؤقتة بنجاح", { position: "bottom-center" });
  };

  const clearDraftSilently = () => {
    isSubmitting.current = true;
    setDraft(initialData);
    localStorage.removeItem(`formDraft_${key}`);
  };

  const removeDraftOnly = () => {
    localStorage.removeItem(`formDraft_${key}`);
  };

  const updateDraft = (newData: Partial<T> | ((prev: T) => T)) => {
    setDraft((prev) => {
      if (typeof newData === 'function') {
        const fn = newData as (prev: T) => T;
        return fn(prev);
      }
      return { ...prev, ...newData };
    });
  };

  return {
    draft,
    setDraft: updateDraft,
    clearDraft,
    clearDraftSilently,
    removeDraftOnly,
    isLoaded
  };
}
