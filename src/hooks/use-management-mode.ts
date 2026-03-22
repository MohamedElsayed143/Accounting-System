import { useManagementModeContext } from "@/components/providers/ManagementModeProvider";

export function useManagementMode() {
  return useManagementModeContext();
}
