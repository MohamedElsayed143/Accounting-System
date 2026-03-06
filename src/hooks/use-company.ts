"use client";

import { useEffect, useState } from "react";
import { getCompanySettingsAction } from "@/app/(dashboard)/settings/actions";

export function useCompany() {
  const [company, setCompany] = useState<{ name: string; nameEn: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanySettingsAction().then((res) => {
      if (res) {
        setCompany({
          name: res.companyName || "شركة المحاسبة الحديثة",
          nameEn: res.companyNameEn || "Modern Accounting Co.",
        });
      }
      setLoading(false);
    });
  }, []);

  return { company, loading };
}
