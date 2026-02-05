"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

type Company = {
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  ntn?: string | null;
  gst_number?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
};

type Customer = {
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  ntn_cnic?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Item = {
  item_number?: string;
  product_description: string;
  quantity: number;
  unit_price: number;
  total_values: number;
  uom?: string;
};

export function InvoiceDocumentView({
  invoiceId,
  invoiceNumber,
  invoiceDate,
  status,
  totalAmount,
  totalTax,
  company,
  customer,
  items,
  estimateNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  totalAmount: number;
  totalTax: number;
  company: Company;
  customer: Customer;
  items: Item[];
  estimateNumber?: string | null;
}) {
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const addressLine = [company.address, company.city, company.province].filter(Boolean).join(", ");
  const customerAddress = [customer.address, customer.city, customer.province].filter(Boolean).join(", ");

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Action bar */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-divider)] bg-[var(--color-surface)] px-4 py-3">
        <Link
          href={`/dashboard/sales/${invoiceId}/edit`}
          className="btn btn-secondary btn-icon"
          aria-label="Edit"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </Link>
        <span className="ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]">
          {status}
        </span>
        {estimateNumber && (
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            From {estimateNumber}
          </span>
        )}
      </div>

      {/* Document body */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-card-bg)] pl-8 pr-10 pt-8 pb-8">
        <div className="mx-auto max-w-4xl">
          {/* Header row */}
          <div className="flex flex-col gap-8 border-b border-[var(--color-divider)] pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt=""
                  className="max-h-20 w-auto shrink-0 object-contain"
                  aria-hidden
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-lg font-semibold text-[var(--color-on-primary-container)]">
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold text-[var(--color-on-surface)]">
                  {company.name}
                </h1>
                {(company.ntn || company.gst_number) && (
                  <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
                    {[company.ntn && `NTN: ${company.ntn}`, company.gst_number && `GST: ${company.gst_number}`].filter(Boolean).join(" · ")}
                  </p>
                )}
                {addressLine && (
                  <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
                    {addressLine}
                  </p>
                )}
                {(company.phone || company.email) && (
                  <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
                    {[company.phone, company.email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-3xl font-bold tracking-tight text-[var(--color-on-surface)]">
                INVOICE
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-on-surface)]">
                # {invoiceNumber}
              </p>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                Invoice Date: {invoiceDate}
              </p>
            </div>
          </div>

          {/* Bill To */}
          <div className="mt-8">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Bill To
            </h2>
            <p className="font-semibold text-[var(--color-on-surface)]">{customer.name}</p>
            {customerAddress && (
              <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
                {customerAddress}
              </p>
            )}
            {customer.ntn_cnic && (
              <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
                NTN: {customer.ntn_cnic}
              </p>
            )}
            {(customer.phone || customer.email) && (
              <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
                {[customer.phone, customer.email].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Items table */}
          <div className="mt-8 overflow-hidden rounded-xl border border-[var(--color-outline)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-divider)] bg-[var(--color-surface-variant)] text-[var(--color-on-surface)]">
                  <th className="w-12 p-3 font-medium">#</th>
                  <th className="w-28 p-3 font-medium">Item Number</th>
                  <th className="p-3 font-medium">Item & Description</th>
                  <th className="w-24 p-3 font-medium text-right">Qty</th>
                  <th className="w-32 p-3 font-medium text-right">Rate</th>
                  <th className="w-36 p-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr
                    key={i}
                    className={i === 0 ? "bg-[var(--color-card-bg)]" : "border-t border-[var(--color-divider)] bg-[var(--color-card-bg)]"}
                  >
                    <td className="p-3 text-[var(--color-on-surface-variant)]">{i + 1}</td>
                    <td className="p-3 text-[var(--color-on-surface)]">{row.item_number ?? ""}</td>
                    <td className="p-3 text-[var(--color-on-surface)]">
                      {row.product_description}
                      {row.uom && row.uom !== "Nos" && (
                        <span className="ml-1 text-[var(--color-on-surface-variant)]">({row.uom})</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-[var(--color-on-surface)]">
                      {Number(row.quantity).toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-[var(--color-on-surface)]">
                      {Number(row.unit_price).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-medium text-[var(--color-on-surface)]">
                      {Number(row.total_values).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <table className="w-full max-w-xs text-sm">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 text-[var(--color-on-surface-variant)]">Subtotal</td>
                  <td className="py-1 text-right font-medium text-[var(--color-on-surface)]">
                    {subtotal.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-[var(--color-on-surface-variant)]">Tax</td>
                  <td className="py-1 text-right font-medium text-[var(--color-on-surface)]">
                    {Number(totalTax).toLocaleString()}
                  </td>
                </tr>
                <tr className="border-t-2 border-[var(--color-divider)]">
                  <td className="py-2 pr-4 font-semibold text-[var(--color-on-surface)]">Total</td>
                  <td className="py-2 text-right text-lg font-semibold text-[var(--color-on-surface)]">
                    {Number(totalAmount).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
