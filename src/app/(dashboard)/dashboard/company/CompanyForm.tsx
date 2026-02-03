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

  return (
    <form action={handleSubmit} className="space-y-6 max-w-xl">
      {state?.error && (
        <div
          className="text-sm p-3 rounded-lg border border-[var(--color-error)] bg-[var(--color-error-bg)] text-[var(--color-error)]"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
          Company name <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={company?.name ?? ""}
          className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)] placeholder:text-[var(--color-on-surface-variant)]"
          placeholder="e.g. Acme Pvt Ltd"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ntn" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
            NTN
          </label>
          <input
            id="ntn"
            name="ntn"
            type="text"
            defaultValue={company?.ntn ?? ""}
            className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
            placeholder="e.g. 6708002-5"
          />
        </div>
        <div>
          <label htmlFor="cnic" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
            CNIC
          </label>
          <input
            id="cnic"
            name="cnic"
            type="text"
            defaultValue={company?.cnic ?? ""}
            className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
            placeholder="e.g. 42501-4002671-9"
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={company?.address ?? ""}
          className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)] placeholder:text-[var(--color-on-surface-variant)]"
          placeholder="Street, area"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={company?.city ?? ""}
            className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
            placeholder="e.g. Lahore"
          />
        </div>
        <div>
          <label htmlFor="province" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
            Province
          </label>
          <input
            id="province"
            name="province"
            type="text"
            defaultValue={company?.province ?? ""}
            className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
            placeholder="e.g. Punjab"
          />
        </div>
      </div>

      <div>
        <label htmlFor="gst_number" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
          GST number <span className="text-[var(--color-on-surface-variant)] font-normal">(optional)</span>
        </label>
        <input
          id="gst_number"
          name="gst_number"
          type="text"
          defaultValue={company?.gst_number ?? ""}
          className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
          placeholder="GST registration number"
        />
      </div>

      <div>
        <label htmlFor="registration_type" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
          Registration type
        </label>
        <select
          id="registration_type"
          name="registration_type"
          defaultValue={company?.registration_type ?? ""}
          className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
        >
          <option value="">— Select —</option>
          <option value="Registered">Registered</option>
          <option value="Unregistered">Unregistered</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            defaultValue={company?.phone ?? ""}
            className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={company?.email ?? ""}
            className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="sales_invoice_prefix" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
            Sales invoice prefix
          </label>
          <input
            id="sales_invoice_prefix"
            name="sales_invoice_prefix"
            type="text"
            defaultValue={company?.sales_invoice_prefix ?? "INV"}
            className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
            placeholder="INV"
          />
        </div>
        <div>
          <label htmlFor="purchase_invoice_prefix" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
            Purchase invoice prefix
          </label>
          <input
            id="purchase_invoice_prefix"
            name="purchase_invoice_prefix"
            type="text"
            defaultValue={company?.purchase_invoice_prefix ?? "PUR"}
            className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-surface)]"
            placeholder="PUR"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-md"
      >
        {loading ? "Saving…" : isCreate ? "Create company" : "Save changes"}
      </button>
    </form>
  );
}
