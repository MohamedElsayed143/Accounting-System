"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "isManagementActive";

export function useManagementMode() {
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

  return { isManagementActive, toggleManagementMode, isInitialized };
}
