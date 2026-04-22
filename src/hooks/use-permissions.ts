"use client";

import { useEffect, useState } from "react";
import { getRBACPermissions } from "@/lib/permissions-actions";
import { getGeneralSettingsAction } from "@/app/(dashboard)/settings/actions";

export function usePermissions() {
  const [permissions, setPermissions] = useState<
    Record<string, boolean | string>
  >({});
  const [generalSettings, setGeneralSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getRBACPermissions(), getGeneralSettingsAction()]).then(
      ([rbacRes, settingsRes]) => {
        setPermissions(rbacRes as Record<string, boolean | string>);
        setGeneralSettings(settingsRes);
        setLoading(false);
      },
    );
  }, []);

  const hasPermission = (key: string) => {
    // If empty (loading or error), default to false for safety
    const val = permissions[key];
    return typeof val === "boolean" ? val : false;
  };

  const isAdmin = permissions["isAdmin"] === true;

  return { permissions, hasPermission, isAdmin, loading, generalSettings };
}
