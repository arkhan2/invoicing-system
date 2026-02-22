"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PerPageDropdown } from "@/components/PerPageDropdown";
import type { PaymentSidebarItem } from "./PaymentsDataContext";

function formatNum(n: number): string {
  return Number(n).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PaymentSidebar({
  payments,
  companyId,
  totalCount,
  page,
  perPage,
  perPageOptions = [50, 100, 200],
  customerId,
  status,
}: {
  payments: PaymentSidebarItem[];
  companyId: string;
  totalCount: number;
  page: number;
  perPage: number;
  perPageOptions?: readonly number[];
  customerId?: string;
  status?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  const ROW_HEIGHT_ESTIMATE = 76;
  const virtualizer = useVirtualizer({
    count: payments.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 8,
  });

  const totalPages = perPage > 0 ? Math.max(1, Math.ceil(totalCount / perPage)) : 1;
  const startItem = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(page * perPage, totalCount);

  const paymentDetailQuery = () => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("perPage", String(perPage));
    if (customerId) p.set("customerId", customerId);
    if (status) p.set("status", status);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  const qs = (params: { page?: number; perPage?: number }) => {
    const p = new URLSearchParams();
    p.set("page", String(params.page ?? page));
    p.set("perPage", String(params.perPage ?? perPage));
    if (customerId) p.set("customerId", customerId);
    if (status) p.set("status", status);
    return `/dashboard/payments?${p.toString()}`;
  };

  const isNew = pathname === "/dashboard/payments/new";
  const activeId =
    pathname.startsWith("/dashboard/payments/") &&
    pathname !== "/dashboard/payments" &&
    !isNew
      ? pathname.replace("/dashboard/payments/", "").split("/")[0]
      : null;

  useEffect(() => {
    if (!activeId) return;
    const idx = payments.findIndex((p) => p.id === activeId);
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: "auto", behavior: "auto" });
  }, [activeId, payments, virtualizer]);

  return (
    <div className="flex h-full flex-col border-r border-[var(--color-outline)] bg-base">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-3">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
        >
          {payments.length === 0 ? (
            <div className="py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
              No payments yet
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
                width: "100%",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const p = payments[virtualRow.index];
                const isActive = activeId === p.id;
                const cardClass = `flex min-h-0 min-w-0 flex-col justify-center gap-1 rounded-xl border-l-4 px-3 py-2.5 text-left transition-all duration-200 ${
                  isActive
                    ? "border-l-[var(--color-primary)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-container)] shadow-sm"
                    : "border-l-transparent border border-[var(--color-outline)] bg-[var(--color-surface)] hover:border-[var(--color-outline)] hover:bg-[var(--color-surface-variant)] hover:shadow-sm"
                }`;
                return (
                  <div
                    key={p.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-2"
                  >
                    <Link
                      href={`/dashboard/payments/${p.id}${paymentDetailQuery()}`}
                      scroll={false}
                      className={`block h-full min-h-0 min-w-0 ${cardClass}`}
                    >
                      <div className="flex min-w-0 items-baseline justify-between gap-2">
                        <span
                          className={`min-w-0 truncate text-sm font-semibold ${
                            isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-card-text)]"
                          }`}
                        >
                          {p.payment_number}
                        </span>
                        <span
                          className={`shrink-0 text-sm tabular-nums font-medium ${
                            isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-on-surface)]"
                          }`}
                        >
                          {formatNum(p.net_amount)}
                        </span>
                      </div>
                      <span
                        className={`block min-w-0 truncate text-xs ${
                          isActive ? "text-[var(--color-on-primary-container)]/85" : "text-[var(--color-on-surface-variant)]"
                        }`}
                      >
                        {p.customer_name || "—"}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {totalCount > 0 && (
        <div className="flex flex-shrink-0 flex-col gap-2 border-t border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-3 py-2">
          <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">
            {startItem}–{endItem} of {totalCount.toLocaleString()}
          </p>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-outline)] bg-surface px-2 py-1.5">
            <div className="relative">
              <PerPageDropdown
                perPage={perPage}
                perPageOptions={perPageOptions}
                onSelect={(n) => router.push(qs({ page: 1, perPage: n }))}
                aria-label="Items per page"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => page > 1 && router.push(qs({ page: page - 1 }))}
                disabled={page <= 1}
                className="rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] disabled:opacity-40 disabled:hover:bg-transparent"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[5rem] text-center text-sm text-[var(--color-on-surface)]">
                {startItem} – {endItem}
              </span>
              <button
                type="button"
                onClick={() => page < totalPages && router.push(qs({ page: page + 1 }))}
                disabled={page >= totalPages}
                className="rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] disabled:opacity-40 disabled:hover:bg-transparent"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
