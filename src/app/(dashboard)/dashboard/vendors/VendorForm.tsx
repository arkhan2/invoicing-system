"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, X, Trash2 } from "lucide-react";
import {
  createVendor,
  updateVendor,
  deleteVendor,
  checkDuplicateVendor,
  type VendorFormState,
} from "./actions";
import { getCountries, getStates, getCities } from "@/lib/location";
import { IconButton } from "@/components/IconButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { useVendorsTopBar } from "./VendorsTopBarContext";

export type Vendor = {
  id: string;
  name: string;
  contact_person_name: string | null;
  ntn_cnic: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  registration_type: string | null;
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
  listHref,
  returnToSpreadsheet,
}: {
  vendor: Vendor | null;
  companyId: string;
  onSuccess: (vendorId?: string) => void;
  onCancel: () => void;
  /** URL for list view; used for redirect after delete. */
  listHref?: string;
  /** When true, after delete navigate to spreadsheet view instead of list. */
  returnToSpreadsheet?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<VendorFormState>({});
  const [selectedCountry, setSelectedCountry] = useState(vendor?.country ?? "Pakistan");
  const [selectedProvince, setSelectedProvince] = useState(vendor?.province ?? "");
  const [selectedCity, setSelectedCity] = useState(vendor?.city ?? "");
  const isCreate = !vendor;
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { setBarState } = useVendorsTopBar();
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<FormData | null>(null);

  const countryOptions = getCountries();
  const stateOptions = getStates(selectedCountry);
  const cityOptions = getCities(selectedCountry, selectedProvince);

  async function doSubmit(formData: FormData) {
    setLoading(true);
    setState({});
    startGlobalProcessing(isCreate ? "Creating vendor…" : "Saving vendor…");
    try {
      if (isCreate) {
        const result = await createVendor(companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Vendor added." });
        onSuccess((result as { vendorId?: string }).vendorId);
      } else {
        const result = await updateVendor(vendor.id, companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Vendor saved." });
        onSuccess();
      }
    } finally {
      endGlobalProcessing();
      setLoading(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name) {
      setState({ error: "Vendor name is required." });
      return;
    }
    const ntn_cnic = (formData.get("ntn_cnic") as string)?.trim() || null;
    const { duplicate } = await checkDuplicateVendor(
      companyId,
      name,
      ntn_cnic,
      vendor?.id
    );
    if (duplicate) {
      setDuplicateConfirm(formData);
      return;
    }
    await doSubmit(formData);
  }

  async function handleDelete() {
    if (!vendor) return;
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteVendor(vendor.id, companyId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Vendor deleted." });
      router.push(listHref ?? (returnToSpreadsheet ? "/dashboard/vendors?view=spreadsheet" : "/dashboard/vendors"));
      router.refresh();
    } finally {
      endGlobalProcessing();
    }
  }

  useEffect(() => {
    setBarState({
      rightSlot: (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <IconButton
            type="button"
            variant="primary"
            icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            label={loading ? "Saving…" : isCreate ? "Add vendor" : "Save"}
            disabled={loading}
            onClick={() => formRef.current?.requestSubmit()}
          />
          {!isCreate && (
            <IconButton
              variant="danger"
              icon={<Trash2 className="w-4 h-4" />}
              label="Delete"
              onClick={() => setDeleteState({ loading: false })}
            />
          )}
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Cancel"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
    });
    return () => setBarState({ rightSlot: null });
  }, [loading, isCreate, onCancel, setBarState]);

  return (
    <>
      <form ref={formRef} action={handleSubmit} className="space-y-6">
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
            placeholder="e.g. Acme Corp"
          />
        </div>
        <div>
          <label htmlFor="vendor-contact_person_name" className={labelClass}>
            Contact person name
          </label>
          <input
            id="vendor-contact_person_name"
            name="contact_person_name"
            type="text"
            defaultValue={vendor?.contact_person_name ?? ""}
            className={inputClass}
            placeholder="e.g. John Smith"
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
        <div>
          <label htmlFor="vendor-registration_type" className={labelClass}>
            Registration type
          </label>
          <select
            id="vendor-registration_type"
            name="registration_type"
            defaultValue={vendor?.registration_type ?? ""}
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
        <div>
          <label htmlFor="vendor-country" className={labelClass}>
            Country
          </label>
          <select
            id="vendor-country"
            name="country"
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              setSelectedProvince("");
              setSelectedCity("");
            }}
            className={inputClass + " min-h-[42px] cursor-pointer"}
          >
            <option value="">— Select —</option>
            {countryOptions.map((c) => (
              <option key={c.isoCode} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="vendor-province" className={labelClass}>
            Province / State
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
            disabled={!selectedCountry}
          >
            <option value="">— Select —</option>
            {stateOptions.map((s) => (
              <option key={s.isoCode} value={s.name}>{s.name}</option>
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
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
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
      </form>
      {!isCreate && (
        <ConfirmDialog
          open={!!deleteState}
          title="Delete vendor?"
          message="This vendor will be removed. This cannot be undone. Vendors with purchase invoices cannot be deleted."
          confirmLabel="Delete"
          variant="danger"
          loading={deleteState?.loading ?? false}
          onConfirm={handleDelete}
          onCancel={() => setDeleteState(null)}
        />
      )}
      <ConfirmDialog
        open={!!duplicateConfirm}
        title="Duplicate vendor?"
        message="A vendor with this name or NTN already exists. Save anyway?"
        confirmLabel="Save anyway"
        variant="primary"
        onConfirm={async () => {
          if (duplicateConfirm) {
            const fd = duplicateConfirm;
            setDuplicateConfirm(null);
            await doSubmit(fd);
          }
        }}
        onCancel={() => setDuplicateConfirm(null)}
      />
    </>
  );
}
