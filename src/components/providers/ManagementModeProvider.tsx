"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "isManagementActive";

interface ManagementModeContextType {
  isManagementActive: boolean;
  isInitialized: boolean;
  toggleManagementMode: (active: boolean) => void;
}

const ManagementModeContext = createContext<ManagementModeContextType | undefined>(undefined);

export function ManagementModeProvider({ children }: { children: React.ReactNode }) {
  const [isManagementActive, setIsManagementActive] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsManagementActive(true);
    }
    setIsInitialized(true);
  }, []);

  const toggleManagementMode = (active: boolean) => {
    setIsManagementActive(active);
    localStorage.setItem(STORAGE_KEY, active.toString());
  };

  return (
    <ManagementModeContext.Provider value={{ isManagementActive, toggleManagementMode, isInitialized }}>
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
