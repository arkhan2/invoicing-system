"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const COMPANY_PATH = "/dashboard/company";

export function DashboardGate({
  hasCompany,
  children,
}: {
  hasCompany: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hasCompany && pathname !== COMPANY_PATH) {
      router.replace(COMPANY_PATH);
    }
  }, [hasCompany, pathname, router]);

  if (!hasCompany && pathname !== COMPANY_PATH) {
    return (
      <main className="flex-1 p-6 overflow-auto bg-surface-variant flex items-center justify-center">
        <p className="text-[var(--color-on-surface-variant)]">Redirecting to company setup…</p>
      </main>
    );
  }

  return <>{children}</>;
}
