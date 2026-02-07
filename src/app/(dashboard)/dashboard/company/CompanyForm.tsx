"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import {
  createCompany,
  updateCompany,
  addSalesTaxRate,
  deleteSalesTaxRate,
  addWithholdingTaxRate,
  deleteWithholdingTaxRate,
  type CompanyFormState,
  type TaxRateRow,
} from "./actions";
import { PAKISTAN_PROVINCES, getCitiesForProvince } from "@/lib/pakistan";
import { IconButton } from "@/components/IconButton";
import { showMessage } from "@/components/MessageBar";

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

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[2.5rem]";
const labelClass = "block text-sm font-medium text-[var(--color-on-surface)] mb-1.5";

export function CompanyForm({
  company,
  salesTaxRates,
  withholdingTaxRates,
}: {
  company: Company | null;
  salesTaxRates: TaxRateRow[];
  withholdingTaxRates: TaxRateRow[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<CompanyFormState>({});
  const [selectedProvince, setSelectedProvince] = useState(company?.province ?? "");
  const [selectedCity, setSelectedCity] = useState(company?.city ?? "");
  const [logoFileLabel, setLogoFileLabel] = useState<string>("");
  const [newSalesName, setNewSalesName] = useState("");
  const [newSalesRate, setNewSalesRate] = useState("");
  const [newWithholdingName, setNewWithholdingName] = useState("");
  const [newWithholdingRate, setNewWithholdingRate] = useState("");
  const [rateSubmitting, setRateSubmitting] = useState<string | null>(null);
  const isCreate = !company;

  const cityOptions = getCitiesForProvince(selectedProvince);

  function preserveScroll(callback: () => void) {
    const main = document.querySelector("main");
    const scrollTop = main?.scrollTop ?? 0;
    callback();
    const restore = () => main?.scrollTo({ top: scrollTop });
    requestAnimationFrame(restore);
    setTimeout(restore, 50);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setState({});
    try {
      if (isCreate) {
        const result = await createCompany(state, formData);
        if (result?.error) setState(result);
      } else {
        const result = await updateCompany(company.id, state, formData);
        if (result?.error) {
          setState(result);
        } else if (result?.success) {
          router.refresh();
          showMessage("Changes saved.", "success");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex h-full min-h-0 flex-col">
      {/* Header: title + Save (same as estimate/invoice edit) */}
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {company && (
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"
              aria-label="Back to dashboard"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
            {isCreate ? "Create your company" : "Company profile"}
          </h2>
        </div>
        <IconButton
          type="submit"
          variant="primary"
          icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          label={loading ? "Saving…" : isCreate ? "Create company" : "Save"}
          disabled={loading}
        />
      </div>

      {/* Body: scrollable, card sections (edit layout) */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-variant)] p-4">
        <div className="mx-auto max-w-4xl space-y-5">
          {state?.error && (
            <div
              className="rounded-xl border border-[var(--color-error)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]"
              role="alert"
            >
              {state.error}
            </div>
          )}

          {/* Logo & name */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Logo & name
            </h3>
            {/* Row 1: Logo preview (left) and Company name (right) */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium text-[var(--color-on-surface)]">Company logo</span>
                {company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt=""
                    className="h-20 w-20 shrink-0 object-contain rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-1"
                    aria-hidden
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-outline)] bg-[var(--color-card-bg)]"
                    aria-hidden
                  >
                    <svg className="size-8 text-[var(--color-on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {company?.logo_url && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
                    <input type="checkbox" name="remove_logo" value="1" className="rounded border-[var(--color-outline)]" />
                    Remove logo
                  </label>
                )}
                {company && (
                  <div className="flex min-h-[2.5rem] items-center gap-3 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2">
                    <input
                      id="logo"
                      type="file"
                      name="logo"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="sr-only"
                      onChange={(e) => setLogoFileLabel(e.target.files?.[0]?.name ?? "")}
                    />
                    <label
                      htmlFor="logo"
                      className="cursor-pointer rounded-lg border border-[var(--color-outline)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-on-primary)] transition-opacity hover:opacity-90"
                    >
                      Choose file
                    </label>
                    <span className="min-w-0 truncate text-sm text-[var(--color-on-surface-variant)]">
                      {logoFileLabel || "No file chosen"}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
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
            </div>
            {/* Logo URL and hint: full width below */}
            <div className="mt-4 space-y-1.5">
              <input
                id="logo_url"
                name="logo_url"
                type="url"
                defaultValue={company?.logo_url && !company.logo_url.includes("supabase") ? company.logo_url : ""}
                className={inputClass}
                placeholder="Or paste logo URL (optional)"
              />
              <p className="text-xs text-[var(--color-on-surface-variant)]">JPEG, PNG, GIF or WebP. Max 1MB.</p>
            </div>
          </section>

          {/* Address */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Address
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="address" className={labelClass}>Street address</label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  defaultValue={company?.address ?? ""}
                  className={inputClass + " resize-y min-h-[4rem]"}
                  placeholder="Street, area"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="province" className={labelClass}>Province</label>
                  <select
                    id="province"
                    name="province"
                    value={selectedProvince}
                    onChange={(e) => {
                      preserveScroll(() => {
                        setSelectedProvince(e.target.value);
                        setSelectedCity("");
                      });
                    }}
                    className={inputClass + " cursor-pointer"}
                  >
                    <option value="">— Select —</option>
                    {PAKISTAN_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="city" className={labelClass}>City</label>
                  <select
                    id="city"
                    name="city"
                    value={selectedCity}
                    onChange={(e) => {
                      preserveScroll(() => setSelectedCity(e.target.value));
                    }}
                    className={inputClass + " cursor-pointer"}
                    disabled={!selectedProvince}
                  >
                    <option value="">— Select —</option>
                    {cityOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Tax identifiers & registration + Contact: two cards side by side on md+ */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Tax identifiers & registration */}
            <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Tax identifiers & registration
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ntn" className={labelClass}>NTN</label>
                  <input
                    id="ntn"
                    name="ntn"
                    type="text"
                    defaultValue={company?.ntn ?? ""}
                    className={inputClass}
                    placeholder="e.g. 6708002-5"
                  />
                </div>
                <div>
                  <label htmlFor="cnic" className={labelClass}>CNIC</label>
                  <input
                    id="cnic"
                    name="cnic"
                    type="text"
                    defaultValue={company?.cnic ?? ""}
                    className={inputClass}
                    placeholder="e.g. 42501-4002671-9"
                  />
                </div>
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
                    className={inputClass + " cursor-pointer"}
                  >
                    <option value="">— Select —</option>
                    <option value="Registered">Registered</option>
                    <option value="Unregistered">Unregistered</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Contact
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="phone" className={labelClass}>Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    defaultValue={company?.phone ?? ""}
                    className={inputClass}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={company?.email ?? ""}
                    className={inputClass}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Invoice prefixes */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Invoice prefixes
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:max-w-[12rem]">
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
              <div className="sm:max-w-[12rem]">
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
          </section>

          {/* Sales tax rates & Withholding tax rates: only when company exists */}
          {company && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Sales tax rates
                </h3>
                <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
                  Add rates (e.g. GST Reg 18%, GST UnReg 20%) to use on estimates and invoices.
                </p>
                <div className="mb-4 grid grid-cols-[1fr_6rem_2.5rem] items-center gap-x-3 gap-y-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Tax Name</span>
                  <span className="text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Percentage</span>
                  <span />
                  {salesTaxRates.map((r) => (
                    <Fragment key={r.id}>
                      <span className="rounded-lg border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2 font-medium text-[var(--color-on-surface)]">{r.name}</span>
                      <span className="text-right text-[var(--color-on-surface-variant)]">{r.rate}%</span>
                      <IconButton
                        variant="danger"
                        icon={<Trash2 className="w-4 h-4" />}
                        label="Remove"
                        disabled={rateSubmitting !== null}
                        onClick={async () => {
                          setRateSubmitting(r.id);
                          const res = await deleteSalesTaxRate(r.id);
                          setRateSubmitting(null);
                          if (res?.error) showMessage(res.error, "error");
                          else router.refresh();
                        }}
                      />
                    </Fragment>
                  ))}
                  {salesTaxRates.length === 0 && (
                    <span className="col-span-3 rounded-lg border border-dashed border-[var(--color-outline)] px-3 py-2 text-[var(--color-on-surface-variant)]">
                      No sales tax rates yet
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-x-3">
                  <input
                    type="text"
                    value={newSalesName}
                    onChange={(e) => setNewSalesName(e.target.value)}
                    placeholder="e.g. Standard"
                    className={inputClass}
                    aria-label="Sales tax rate name"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={newSalesRate}
                    onChange={(e) => setNewSalesRate(e.target.value)}
                    placeholder="%"
                    className={inputClass + " text-right"}
                    aria-label="Sales tax rate %"
                  />
                  <IconButton
                    variant="add"
                    icon={<Plus className="w-4 h-4" />}
                    label="Add sales tax rate"
                    disabled={rateSubmitting !== null}
                    onClick={async () => {
                      const rate = parseFloat(newSalesRate);
                      if (!(newSalesName.trim()) || Number.isNaN(rate) || rate < 0 || rate > 100) {
                        showMessage("Enter a name and rate (0–100).", "error");
                        return;
                      }
                      setRateSubmitting("add-sales");
                      const res = await addSalesTaxRate(company.id, newSalesName.trim(), rate);
                      setRateSubmitting(null);
                      if (res?.error) showMessage(res.error, "error");
                      else {
                        setNewSalesName("");
                        setNewSalesRate("");
                        router.refresh();
                      }
                    }}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Withholding tax rates
                </h3>
                <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
                  Add withholding tax rates (e.g. 3%, 6%) for estimates and invoices.
                </p>
                <div className="mb-4 grid grid-cols-[1fr_6rem_2.5rem] items-center gap-x-3 gap-y-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Tax Name</span>
                  <span className="text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Percentage</span>
                  <span />
                  {withholdingTaxRates.map((r) => (
                    <Fragment key={r.id}>
                      <span className="rounded-lg border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2 font-medium text-[var(--color-on-surface)]">{r.name}</span>
                      <span className="text-right text-[var(--color-on-surface-variant)]">{r.rate}%</span>
                      <IconButton
                        variant="danger"
                        icon={<Trash2 className="w-4 h-4" />}
                        label="Remove"
                        disabled={rateSubmitting !== null}
                        onClick={async () => {
                          setRateSubmitting(r.id);
                          const res = await deleteWithholdingTaxRate(r.id);
                          setRateSubmitting(null);
                          if (res?.error) showMessage(res.error, "error");
                          else router.refresh();
                        }}
                      />
                    </Fragment>
                  ))}
                  {withholdingTaxRates.length === 0 && (
                    <span className="col-span-3 rounded-lg border border-dashed border-[var(--color-outline)] px-3 py-2 text-[var(--color-on-surface-variant)]">
                      No withholding tax rates yet
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-x-3">
                  <input
                    type="text"
                    value={newWithholdingName}
                    onChange={(e) => setNewWithholdingName(e.target.value)}
                    placeholder="e.g. WHT 3%"
                    className={inputClass}
                    aria-label="Withholding tax rate name"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={newWithholdingRate}
                    onChange={(e) => setNewWithholdingRate(e.target.value)}
                    placeholder="%"
                    className={inputClass + " text-right"}
                    aria-label="Withholding tax rate %"
                  />
                  <IconButton
                    variant="add"
                    icon={<Plus className="w-4 h-4" />}
                    label="Add withholding tax rate"
                    disabled={rateSubmitting !== null}
                    onClick={async () => {
                      const rate = parseFloat(newWithholdingRate);
                      if (!(newWithholdingName.trim()) || Number.isNaN(rate) || rate < 0 || rate > 100) {
                        showMessage("Enter a name and rate (0–100).", "error");
                        return;
                      }
                      setRateSubmitting("add-withholding");
                      const res = await addWithholdingTaxRate(company.id, newWithholdingName.trim(), rate);
                      setRateSubmitting(null);
                      if (res?.error) showMessage(res.error, "error");
                      else {
                        setNewWithholdingName("");
                        setNewWithholdingRate("");
                        router.refresh();
                      }
                    }}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
