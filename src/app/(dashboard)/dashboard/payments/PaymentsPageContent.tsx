"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { usePaymentsData } from "./PaymentsDataContext";
import { usePayments } from "./PaymentsContext";
import { PaymentsTopBar } from "./PaymentsTopBar";
import { PaymentSidebar } from "./PaymentSidebar";
import { PaymentsTable } from "./PaymentsTable";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const topBarClass =
  "dashboard-top-bar flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3 max-lg:sticky max-lg:top-0 max-lg:z-10";

function listQs(params: { page?: number; perPage?: number }, searchParams: URLSearchParams) {
  const p = new URLSearchParams(searchParams);
  if (params.page != null) p.set("page", String(params.page));
  if (params.perPage != null) p.set("perPage", String(params.perPage));
  return `/dashboard/payments?${p.toString()}`;
}

export function PaymentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { companyId } = usePayments();
  const {
    payments,
    totalCount,
    page,
    perPage,
    perPageOptions,
    customerId,
    status,
    sidebarList,
  } = usePaymentsData();
  const [perPageOpen, setPerPageOpen] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  const hasPagination = totalCount > 0;
  const totalPages = perPage > 0 ? Math.max(1, Math.ceil(totalCount / perPage)) : 1;
  const startItem = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(page * perPage, totalCount);

  if (isLg) {
    return (
      <>
        <PaymentsTopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
            <div className="card rounded-none border-0 h-full min-h-0 flex flex-col overflow-hidden p-0">
              {payments.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                  <Wallet className="size-12 text-[var(--color-on-surface-variant)]" />
                  <p className="text-sm text-[var(--color-on-surface-variant)]">
                    No payments yet. Create a payment to get started.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
                  <div className="overflow-auto rounded-xl border border-[var(--color-outline)] min-h-0 flex-1">
                    <PaymentsTable payments={payments} companyId={companyId} />
                  </div>
                </div>
              )}
            </div>
          </div>
          {hasPagination && (
            <div className="flex flex-shrink-0 flex-col gap-2 border-t border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-4 py-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-outline)] bg-surface px-2 py-1.5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPerPageOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-sm text-[var(--color-on-surface)]"
                    aria-expanded={perPageOpen}
                    aria-haspopup="listbox"
                    aria-label="Items per page"
                  >
                    <Settings className="h-3.5 w-3.5 text-[var(--color-on-surface-variant)]" />
                    <span>{perPage} per page</span>
                  </button>
                  {perPageOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        aria-hidden
                        onClick={() => setPerPageOpen(false)}
                      />
                      <ul
                        role="listbox"
                        className="absolute bottom-full left-0 z-20 mb-1 min-w-[8rem] rounded-lg border border-[var(--color-outline)] bg-elevated py-1 shadow-elevated"
                      >
                        {perPageOptions.map((n) => (
                          <li key={n} role="option">
                            <button
                              type="button"
                              className="w-full px-3 py-1.5 text-left text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)]"
                              onClick={() => {
                                setPerPageOpen(false);
                                router.push(listQs({ page: 1, perPage: n }, searchParams));
                              }}
                            >
                              {n} per page
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-on-surface-variant)]">
                    {startItem}–{endItem} of {totalCount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => page > 1 && router.push(listQs({ page: page - 1 }, searchParams))}
                      disabled={page <= 1}
                      className="rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] disabled:opacity-40 disabled:hover:bg-transparent"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => page < totalPages && router.push(listQs({ page: page + 1 }, searchParams))}
                      disabled={page >= totalPages}
                      className="rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] disabled:opacity-40 disabled:hover:bg-transparent"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PaymentsTopBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PaymentSidebar
          payments={sidebarList}
          companyId={companyId}
          totalCount={totalCount}
          page={page}
          perPage={perPage}
          perPageOptions={perPageOptions}
          customerId={customerId || undefined}
          status={status || undefined}
        />
      </div>
    </div>
  );
}
