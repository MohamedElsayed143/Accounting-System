"use client";

import { useEffect, useState } from "react";
import { getCompanySettingsAction } from "@/app/(dashboard)/settings/actions";

export function useCompany() {
  const [company, setCompany] = useState<{ name: string; nameEn: string; logo: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanySettingsAction().then((res) => {
      if (res) {
        setCompany({
          name: res.companyName || "شركة المحاسبة الحديثة",
          nameEn: res.companyNameEn || "Modern Accounting Co.",
          logo: res.companyLogo || null,
        });
      }
      setLoading(false);
    });
  }, []);

  return { company, loading };
}
