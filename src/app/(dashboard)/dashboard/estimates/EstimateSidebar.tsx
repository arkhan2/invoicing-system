"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  deleteEstimate,
  convertEstimateToInvoice,
} from "./actions";
import { showMessage } from "@/components/MessageBar";
import type { EstimateListItem } from "./EstimateForm";

export function EstimateSidebar({
  estimates,
  companyId,
}: {
  estimates: EstimateListItem[];
  companyId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteState, setDeleteState] = useState<{ estimateId: string; loading: boolean } | null>(null);
  const [convertState, setConvertState] = useState<{ estimateId: string; loading: boolean } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return estimates;
    return estimates.filter(
      (e) =>
        e.estimate_number.toLowerCase().includes(q) ||
        e.customer_name.toLowerCase().includes(q) ||
        (e.status?.toLowerCase().includes(q) ?? false)
    );
  }, [estimates, search]);

  const isNew = pathname === "/dashboard/estimates/new";
  const activeId = pathname.startsWith("/dashboard/estimates/") && pathname !== "/dashboard/estimates" && !isNew
    ? pathname.replace("/dashboard/estimates/", "").split("/")[0]
    : null;

  const canConvert = (status: string) =>
    status !== "Converted" && status !== "Declined" && status !== "Expired";

  function openDelete(e: React.MouseEvent, estimateId: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteState({ estimateId, loading: false });
  }

  function openConvert(e: React.MouseEvent, estimateId: string) {
    e.preventDefault();
    e.stopPropagation();
    setConvertState({ estimateId, loading: false });
  }

  async function confirmDelete() {
    if (!deleteState) return;
    setDeleteState((prev) => (prev ? { ...prev, loading: true } : null));
    const result = await deleteEstimate(deleteState.estimateId);
    setDeleteState(null);
    if (result?.error) {
      showMessage(result.error, "error");
      return;
    }
    router.refresh();
    router.push("/dashboard/estimates");
    showMessage("Estimate deleted.", "success");
  }

  async function confirmConvert() {
    if (!convertState) return;
    setConvertState((prev) => (prev ? { ...prev, loading: true } : null));
    const result = await convertEstimateToInvoice(convertState.estimateId);
    setConvertState(null);
    if (result?.error) {
      showMessage(result.error, "error");
      return;
    }
    router.refresh();
    showMessage("Invoice created from estimate.", "success");
    if (result.invoiceId) {
      router.push(`/dashboard/sales/${result.invoiceId}`);
    }
  }

  const inputClass =
    "w-full border border-[var(--color-outline)] rounded-xl px-3 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  return (
    <>
      <div className="flex h-full flex-col border-r border-[var(--color-outline)] bg-[var(--color-surface)]">
        <div className="flex flex-shrink-0 items-center gap-2 px-3 pt-3 pb-2">
          <Link
            href="/dashboard/estimates/new"
            className={`inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-full border transition-colors duration-200 ${
              isNew
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "border-[var(--color-outline)] bg-[var(--color-card-bg)] text-[var(--color-card-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]"
            }`}
            aria-label="New estimate"
            title="New estimate"
          >
            <Plus className="w-4 h-4" />
          </Link>
          <input
            type="search"
            placeholder="Search estimates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " min-h-[2rem]"}
            aria-label="Search estimates"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
              {estimates.length === 0 ? "No estimates yet" : "No matches"}
            </div>
          ) : (
            <ul className="space-y-2" role="list">
              {filtered.map((e) => {
                const isActive = activeId === e.id;
                return (
                  <li key={e.id}>
                    <Link
                      href={`/dashboard/estimates/${e.id}`}
                      className={`block rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-container)]"
                          : "border-[var(--color-outline)] bg-[var(--color-card-bg)] hover:bg-[var(--color-surface-variant)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm font-medium ${isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-card-text)]"}`}>
                          {e.estimate_number}
                        </span>
                        <span className={`shrink-0 text-xs ${isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-card-text)]"}`}>
                          {e.total_amount != null ? Number(e.total_amount).toFixed(0) : "—"}
                        </span>
                      </div>
                      <div className={`mt-0.5 truncate text-xs ${isActive ? "text-[var(--color-on-primary-container)]/90" : "text-[var(--color-card-text)]"}`}>
                        {e.customer_name || "—"}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            e.status === "Converted"
                              ? "bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]"
                              : "bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]"
                          }`}
                        >
                          {e.status}
                        </span>
                        <span className="flex items-center gap-1">
                          {canConvert(e.status) && (
                            <button
                              type="button"
                              onClick={(ev) => openConvert(ev, e.id)}
                              className="text-[10px] text-[var(--color-secondary)] hover:underline"
                            >
                              Convert
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(ev) => openDelete(ev, e.id)}
                            className="text-[10px] text-[var(--color-error)] hover:underline"
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteState}
        title="Delete estimate?"
        message="This estimate will be removed. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.loading ?? false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteState(null)}
      />
      <ConfirmDialog
        open={!!convertState}
        title="Convert to invoice?"
        message="A new draft sales invoice will be created from this estimate."
        confirmLabel="Convert"
        variant="primary"
        loadingLabel="Converting…"
        loading={convertState?.loading ?? false}
        onConfirm={confirmConvert}
        onCancel={() => setConvertState(null)}
      />
    </>
  );
}
