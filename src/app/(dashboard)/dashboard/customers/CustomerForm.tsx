"use client";

import { useState } from "react";
import {
  createCustomer,
  updateCustomer,
  type CustomerFormState,
} from "./actions";
import { PAKISTAN_PROVINCES, getCitiesForProvince } from "@/lib/pakistan";
import { showMessage } from "@/components/MessageBar";

export type Customer = {
  id: string;
  name: string;
  ntn_cnic: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  registration_type: string | null;
  phone: string | null;
  email: string | null;
  created_at?: string;
  updated_at?: string | null;
};

const inputClass =
  "w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors focus:border-[var(--color-primary)]";
const labelClass =
  "block text-sm font-medium text-[var(--color-on-surface)] mb-1.5";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function CustomerForm({
  customer,
  companyId,
  onSuccess,
  onCancel,
}: {
  customer: Customer | null;
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<CustomerFormState>({});
  const [selectedProvince, setSelectedProvince] = useState(customer?.province ?? "");
  const [selectedCity, setSelectedCity] = useState(customer?.city ?? "");
  const isCreate = !customer;

  const cityOptions = getCitiesForProvince(selectedProvince);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setState({});
    try {
      if (isCreate) {
        const result = await createCustomer(companyId, state, formData);
        if (result?.error) {
          setState(result);
          return;
        }
      } else {
        const result = await updateCustomer(customer.id, companyId, state, formData);
        if (result?.error) {
          setState(result);
          return;
        }
      }
      showMessage(isCreate ? "Customer added." : "Customer saved.", "success");
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {state?.error && (
        <div
          className="rounded-lg border border-[var(--color-error)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <Section title="Details">
        <div>
          <label htmlFor="customer-name" className={labelClass}>
            Name <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            id="customer-name"
            name="name"
            type="text"
            required
            defaultValue={customer?.name ?? ""}
            className={inputClass}
            placeholder="e.g. Acme Corp"
          />
        </div>
        <div>
          <label htmlFor="customer-ntn_cnic" className={labelClass}>
            NTN / CNIC
          </label>
          <input
            id="customer-ntn_cnic"
            name="ntn_cnic"
            type="text"
            defaultValue={customer?.ntn_cnic ?? ""}
            className={inputClass}
            placeholder="e.g. 6708002-5"
          />
        </div>
        <div>
          <label htmlFor="customer-registration_type" className={labelClass}>
            Registration type
          </label>
          <select
            id="customer-registration_type"
            name="registration_type"
            defaultValue={customer?.registration_type ?? ""}
            className={inputClass + " min-h-[42px] cursor-pointer"}
          >
            <option value="">— Select —</option>
            <option value="Registered">Registered</option>
            <option value="Unregistered">Unregistered</option>
          </select>
        </div>
      </Section>

      <Section title="Address">
        <div>
          <label htmlFor="customer-address" className={labelClass}>
            Address
          </label>
          <textarea
            id="customer-address"
            name="address"
            rows={2}
            defaultValue={customer?.address ?? ""}
            className={inputClass + " resize-y"}
            placeholder="Street, area"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="customer-province" className={labelClass}>
              Province
            </label>
            <select
              id="customer-province"
              name="province"
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setSelectedCity("");
              }}
              className={inputClass + " min-h-[42px] cursor-pointer"}
            >
              <option value="">— Select —</option>
              {PAKISTAN_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="customer-city" className={labelClass}>
              City
            </label>
            <select
              id="customer-city"
              name="city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className={inputClass + " min-h-[42px] cursor-pointer"}
              disabled={!selectedProvince}
            >
              <option value="">— Select —</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="customer-phone" className={labelClass}>
              Phone
            </label>
            <input
              id="customer-phone"
              name="phone"
              type="text"
              defaultValue={customer?.phone ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="customer-email" className={labelClass}>
              Email
            </label>
            <input
              id="customer-email"
              name="email"
              type="email"
              defaultValue={customer?.email ?? ""}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-outline)] pt-4">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-sm min-w-[100px]"
        >
          {loading ? "Saving…" : isCreate ? "Add customer" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary btn-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
