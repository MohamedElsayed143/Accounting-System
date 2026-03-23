"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuthSession } from "@/app/login/actions";

const STORAGE_KEY = "isManagementActive";

interface ManagementModeContextType {
  isManagementActive: boolean;
  isInitialized: boolean;
  isUserAdmin: boolean;
  toggleManagementMode: (active: boolean) => void;
}

const ManagementModeContext = createContext<ManagementModeContextType | undefined>(undefined);

export function ManagementModeProvider({ children }: { children: React.ReactNode }) {
  const [isManagementActive, setIsManagementActive] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      // 1. Fetch Session
      const session = await getAuthSession();
      const isAdmin = session?.user?.role === "ADMIN";
      setIsUserAdmin(isAdmin);

      // 2. Initialise Mode
      const stored = localStorage.getItem(STORAGE_KEY);
      
      // Force FALSE if not admin
      if (stored === "true" && isAdmin) {
        setIsManagementActive(true);
      } else {
        setIsManagementActive(false);
        if (stored === "true" && !isAdmin) {
          localStorage.setItem(STORAGE_KEY, "false");
        }
      }
      setIsInitialized(true);
    }
    
    init();
  }, []);

  const toggleManagementMode = (active: boolean) => {
    if (!isUserAdmin && active) {
      console.warn("Unauthorized attempt to activate Management Mode");
      return;
    }
    setIsManagementActive(active);
    localStorage.setItem(STORAGE_KEY, active.toString());
  };

  return (
    <ManagementModeContext.Provider value={{ isManagementActive, toggleManagementMode, isInitialized, isUserAdmin }}>
      {children}
    </ManagementModeContext.Provider>
  );
}

export function useManagementModeContext() {
  const context = useContext(ManagementModeContext);
  if (context === undefined) {
    throw new Error("useManagementModeContext must be used within a ManagementModeProvider");
  }
  return context;
}
