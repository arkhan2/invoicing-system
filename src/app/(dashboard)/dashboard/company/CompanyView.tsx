"use client";

import Link from "next/link";
import { Pencil, ChevronLeft } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import type { TaxRateRow } from "./actions";

type Company = {
  id: string;
  name: string;
  ntn: string | null;
  cnic: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  gst_number: string | null;
  registration_type: string | null;
  phone: string | null;
  email: string | null;
  sales_invoice_prefix: string | null;
  purchase_invoice_prefix: string | null;
  logo_url: string | null;
};

export function CompanyView({
  company,
  salesTaxRates,
  withholdingTaxRates,
  onEdit,
}: {
  company: Company;
  salesTaxRates: TaxRateRow[];
  withholdingTaxRates: TaxRateRow[];
  onEdit: () => void;
}) {
  const labelClass = "block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1";
  const valueClass = "text-sm text-[var(--color-on-surface)]";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">Company profile</h2>
        </div>
        <IconButton
          variant="edit"
          icon={<Pencil className="w-4 h-4" />}
          label="Edit company"
          onClick={onEdit}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-variant)] p-4">
        <div className="mx-auto max-w-4xl space-y-5">
          {/* Logo & name */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Logo & name
            </h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt=""
                  className="h-20 w-20 shrink-0 object-contain rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-1"
                  aria-hidden
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-outline)] bg-[var(--color-card-bg)]">
                  <span className="text-xs text-[var(--color-on-surface-variant)]">No logo</span>
                </div>
              )}
              <div className="min-w-0">
                <span className={labelClass}>Company name</span>
                <p className={valueClass}>{company.name || "—"}</p>
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Address
            </h3>
            <div className="space-y-3">
              <div>
                <span className={labelClass}>Street address</span>
                <p className={valueClass}>{company.address || "—"}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <span className={labelClass}>Province</span>
                  <p className={valueClass}>{company.province || "—"}</p>
                </div>
                <div>
                  <span className={labelClass}>City</span>
                  <p className={valueClass}>{company.city || "—"}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Tax identifiers & registration */}
            <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Tax identifiers & registration
              </h3>
              <div className="space-y-3">
                <div>
                  <span className={labelClass}>NTN</span>
                  <p className={valueClass}>{company.ntn || "—"}</p>
                </div>
                <div>
                  <span className={labelClass}>CNIC</span>
                  <p className={valueClass}>{company.cnic || "—"}</p>
                </div>
                <div>
                  <span className={labelClass}>GST number</span>
                  <p className={valueClass}>{company.gst_number || "—"}</p>
                </div>
                <div>
                  <span className={labelClass}>Registration type</span>
                  <p className={valueClass}>{company.registration_type || "—"}</p>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Contact
              </h3>
              <div className="space-y-3">
                <div>
                  <span className={labelClass}>Phone</span>
                  <p className={valueClass}>{company.phone || "—"}</p>
                </div>
                <div>
                  <span className={labelClass}>Email</span>
                  <p className={valueClass}>{company.email || "—"}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Invoice prefixes */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Invoice prefixes
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className={labelClass}>Sales invoice prefix</span>
                <p className={valueClass}>{company.sales_invoice_prefix || "—"}</p>
              </div>
              <div>
                <span className={labelClass}>Purchase invoice prefix</span>
                <p className={valueClass}>{company.purchase_invoice_prefix || "—"}</p>
              </div>
            </div>
          </section>

          {/* Sales tax rates */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Sales tax rates
            </h3>
            {salesTaxRates.length === 0 ? (
              <p className="text-sm text-[var(--color-on-surface-variant)]">No sales tax rates</p>
            ) : (
              <ul className="space-y-2">
                {salesTaxRates.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2 text-sm">
                    <span className="font-medium text-[var(--color-on-surface)]">{r.name}</span>
                    <span className="text-[var(--color-on-surface-variant)]">{r.rate}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Withholding tax rates */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Withholding tax rates
            </h3>
            {withholdingTaxRates.length === 0 ? (
              <p className="text-sm text-[var(--color-on-surface-variant)]">No withholding tax rates</p>
            ) : (
              <ul className="space-y-2">
                {withholdingTaxRates.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2 text-sm">
                    <span className="font-medium text-[var(--color-on-surface)]">{r.name}</span>
                    <span className="text-[var(--color-on-surface-variant)]">{r.rate}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
