"use client";

import { useEffect, useState } from "react";
import { getRBACPermissions } from "@/lib/permissions-actions";

export function usePermissions() {
  const [permissions, setPermissions] = useState<Record<string, boolean | string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRBACPermissions().then((res) => {
      setPermissions(res as Record<string, boolean | string>);
      setLoading(false);
    });
  }, []);

  const hasPermission = (key: string) => {
    // If empty (loading or error), default to false for safety
    const val = permissions[key];
    return typeof val === "boolean" ? val : false;
  };

  const isAdmin = permissions["isAdmin"] === true;

  return { permissions, hasPermission, isAdmin, loading };
}
