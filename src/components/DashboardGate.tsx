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
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[var(--color-surface-variant)] p-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 items-center justify-center">
          <p className="text-[var(--color-on-surface-variant)]">Redirecting to company setup…</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
