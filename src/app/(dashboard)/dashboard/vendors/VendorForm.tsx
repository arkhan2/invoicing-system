"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import {
  createVendor,
  updateVendor,
  type VendorFormState,
} from "./actions";
import { PAKISTAN_PROVINCES, getCitiesForProvince } from "@/lib/pakistan";
import { IconButton } from "@/components/IconButton";
import { showMessage } from "@/components/MessageBar";

export type Vendor = {
  id: string;
  name: string;
  ntn_cnic: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  created_at?: string;
  updated_at?: string | null;
};

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
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

export function VendorForm({
  vendor,
  companyId,
  onSuccess,
  onCancel,
}: {
  vendor: Vendor | null;
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<VendorFormState>({});
  const [selectedProvince, setSelectedProvince] = useState(vendor?.province ?? "");
  const [selectedCity, setSelectedCity] = useState(vendor?.city ?? "");
  const isCreate = !vendor;

  const cityOptions = getCitiesForProvince(selectedProvince);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setState({});
    try {
      if (isCreate) {
        const result = await createVendor(companyId, state, formData);
        if (result?.error) {
          setState(result);
          return;
        }
      } else {
        const result = await updateVendor(vendor.id, companyId, state, formData);
        if (result?.error) {
          setState(result);
          return;
        }
      }
      showMessage(isCreate ? "Vendor added." : "Vendor saved.", "success");
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {state?.error && (
        <div
          className="rounded-xl border border-[var(--color-error)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <Section title="Details">
        <div>
          <label htmlFor="vendor-name" className={labelClass}>
            Name <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            id="vendor-name"
            name="name"
            type="text"
            required
            defaultValue={vendor?.name ?? ""}
            className={inputClass}
            placeholder="e.g. Acme Supplies"
          />
        </div>
        <div>
          <label htmlFor="vendor-ntn_cnic" className={labelClass}>
            NTN / CNIC
          </label>
          <input
            id="vendor-ntn_cnic"
            name="ntn_cnic"
            type="text"
            defaultValue={vendor?.ntn_cnic ?? ""}
            className={inputClass}
            placeholder="e.g. 6708002-5"
          />
        </div>
      </Section>

      <Section title="Address">
        <div>
          <label htmlFor="vendor-address" className={labelClass}>
            Address
          </label>
          <textarea
            id="vendor-address"
            name="address"
            rows={2}
            defaultValue={vendor?.address ?? ""}
            className={inputClass + " resize-y"}
            placeholder="Street, area"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="vendor-province" className={labelClass}>
              Province
            </label>
            <select
              id="vendor-province"
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
            <label htmlFor="vendor-city" className={labelClass}>
              City
            </label>
            <select
              id="vendor-city"
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
            <label htmlFor="vendor-phone" className={labelClass}>
              Phone
            </label>
            <input
              id="vendor-phone"
              name="phone"
              type="text"
              defaultValue={vendor?.phone ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="vendor-email" className={labelClass}>
              Email
            </label>
            <input
              id="vendor-email"
              name="email"
              type="email"
              defaultValue={vendor?.email ?? ""}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-outline)] pt-4">
        <IconButton
          type="submit"
          variant="primary"
          icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          label={loading ? "Saving…" : isCreate ? "Add vendor" : "Save changes"}
          disabled={loading}
        />
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
