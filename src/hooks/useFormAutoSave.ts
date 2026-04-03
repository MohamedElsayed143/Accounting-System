import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useFormAutoSave<T>(
  key: string,
  currentState: T,
  onRestore: (draft: T) => void,
  skipSave: boolean = false
) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Load draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(`formDraft_${key}`);
      if (savedDraft) {
        onRestore(JSON.parse(savedDraft));
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
    setIsLoaded(true);
  }, [key]);

  // Save draft whenever state changes
  useEffect(() => {
    if (!isLoaded || skipSave) return;
    const currentJson = JSON.stringify(currentState);
    localStorage.setItem(`formDraft_${key}`, currentJson);
  }, [currentState, key, isLoaded, skipSave]);

  // Handle beforeunload to warn user
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (skipSave) return;
      
      const savedDraft = localStorage.getItem(`formDraft_${key}`);
      // If there's a draft, and it has actual content (meaning it's not empty string/empty array)
      // This is a simple heuristic: Warn if saved draft length > 20 (meaning there's data in the JSON)
      if (savedDraft && savedDraft.length > 30) {
        e.preventDefault();
        e.returnValue = "لديك بيانات غير محفوظة. هل أنت متأكد من المغادرة؟";
        return "لديك بيانات غير محفوظة. هل أنت متأكد من المغادرة؟";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [key, skipSave]);

  const clearDraft = () => {
    localStorage.removeItem(`formDraft_${key}`);
    toast.success("تم تصفية البيانات المؤقتة بنجاح", { position: "bottom-center" });
  };

  const removeDraftOnly = () => {
    localStorage.removeItem(`formDraft_${key}`);
  };

  return { clearDraft, removeDraftOnly, isLoaded };
}
