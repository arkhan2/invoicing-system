"use client";

import { useState } from "react";
import { createCompany, updateCompany, type CompanyFormState } from "./actions";

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

export function CompanyForm({ company }: { company: Company | null }) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<CompanyFormState>({});

  const isCreate = !company;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setState({});
    try {
      if (isCreate) {
        const result = await createCompany(state, formData);
        if (result?.error) setState(result);
      } else {
        const result = await updateCompany(company.id, state, formData);
        if (result?.error) setState(result);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)] placeholder:text-[var(--color-on-surface-variant)] transition-colors focus:border-[var(--color-primary)]";
  const labelClass = "block text-sm font-medium text-[var(--color-on-surface)] mb-1.5";

  function Section({
    title,
    children,
    className = "",
  }: {
    title: string;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <section className={className}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          {title}
        </h2>
        <div className="space-y-4">{children}</div>
      </section>
    );
  }

  return (
    <form action={handleSubmit} className="max-w-2xl">
      {state?.error && (
        <div
          className="mx-6 mt-6 rounded-lg border border-[var(--color-error)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]"
          role="alert"
        >
          {state.error}
        </div>
      )}

      {/* Logo — full-width highlight block */}
      <div className="border-b border-[var(--color-outline)] bg-[var(--color-surface-variant)]/50 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex items-center gap-4">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt="Company logo"
                className="h-20 w-20 shrink-0 object-contain rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface)] p-1"
              />
            ) : (
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-outline)] bg-[var(--color-surface)]"
                aria-hidden
              >
                <svg className="size-8 text-[var(--color-on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <label className={labelClass}>Company logo</label>
              {company?.logo_url && (
                <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
                  <input type="checkbox" name="remove_logo" value="1" className="rounded border-[var(--color-outline)]" />
                  Remove logo
                </label>
              )}
              {company && (
                <input
                  type="file"
                  name="logo"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="text-sm text-[var(--color-on-surface)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-2 file:text-[var(--color-on-primary)] file:transition-colors file:hover:bg-[var(--color-primary-hover)]"
                />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="logo_url" className="sr-only">
              Logo URL
            </label>
            <input
              id="logo_url"
              name="logo_url"
              type="url"
              defaultValue={company?.logo_url ?? ""}
              className={inputClass}
              placeholder="Or paste logo URL (optional)"
            />
            <p className="mt-1.5 text-xs text-[var(--color-on-surface-variant)]">
              JPEG, PNG, GIF or WebP. Max 1MB.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-6 py-6">
        <Section title="Company details">
          <div>
            <label htmlFor="name" className={labelClass}>
              Company name <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={company?.name ?? ""}
              className={inputClass}
              placeholder="e.g. Acme Pvt Ltd"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ntn" className={labelClass}>NTN</label>
              <input id="ntn" name="ntn" type="text" defaultValue={company?.ntn ?? ""} className={inputClass} placeholder="e.g. 6708002-5" />
            </div>
            <div>
              <label htmlFor="cnic" className={labelClass}>CNIC</label>
              <input id="cnic" name="cnic" type="text" defaultValue={company?.cnic ?? ""} className={inputClass} placeholder="e.g. 42501-4002671-9" />
            </div>
          </div>
        </Section>

        <Section title="Address">
          <div>
            <label htmlFor="address" className={labelClass}>Street address</label>
            <textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={company?.address ?? ""}
              className={inputClass + " resize-y"}
              placeholder="Street, area"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className={labelClass}>City</label>
              <input id="city" name="city" type="text" defaultValue={company?.city ?? ""} className={inputClass} placeholder="e.g. Lahore" />
            </div>
            <div>
              <label htmlFor="province" className={labelClass}>Province</label>
              <input id="province" name="province" type="text" defaultValue={company?.province ?? ""} className={inputClass} placeholder="e.g. Punjab" />
            </div>
          </div>
        </Section>

        <Section title="Tax & registration">
          <div>
            <label htmlFor="gst_number" className={labelClass}>
              GST number <span className="font-normal text-[var(--color-on-surface-variant)]">(optional)</span>
            </label>
            <input
              id="gst_number"
              name="gst_number"
              type="text"
              defaultValue={company?.gst_number ?? ""}
              className={inputClass}
              placeholder="GST registration number"
            />
          </div>
          <div>
            <label htmlFor="registration_type" className={labelClass}>Registration type</label>
            <select
              id="registration_type"
              name="registration_type"
              defaultValue={company?.registration_type ?? ""}
              className={inputClass}
            >
              <option value="">— Select —</option>
              <option value="Registered">Registered</option>
              <option value="Unregistered">Unregistered</option>
            </select>
          </div>
        </Section>

        <Section title="Contact">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className={labelClass}>Phone</label>
              <input id="phone" name="phone" type="text" defaultValue={company?.phone ?? ""} className={inputClass} />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" name="email" type="email" defaultValue={company?.email ?? ""} className={inputClass} />
            </div>
          </div>
        </Section>

        <Section title="Invoice prefixes" className="pb-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sales_invoice_prefix" className={labelClass}>Sales invoice prefix</label>
              <input
                id="sales_invoice_prefix"
                name="sales_invoice_prefix"
                type="text"
                defaultValue={company?.sales_invoice_prefix ?? "INV"}
                className={inputClass}
                placeholder="INV"
              />
            </div>
            <div>
              <label htmlFor="purchase_invoice_prefix" className={labelClass}>Purchase invoice prefix</label>
              <input
                id="purchase_invoice_prefix"
                name="purchase_invoice_prefix"
                type="text"
                defaultValue={company?.purchase_invoice_prefix ?? "PUR"}
                className={inputClass}
                placeholder="PUR"
              />
            </div>
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-outline)] pt-6">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-md min-w-[140px]"
          >
            {loading ? "Saving…" : isCreate ? "Create company" : "Save changes"}
          </button>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            {isCreate ? "You’ll be redirected to the dashboard after creating your company." : "Changes apply to new invoices and documents."}
          </p>
        </div>
      </div>
    </form>
  );
}
