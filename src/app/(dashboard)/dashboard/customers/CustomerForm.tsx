"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, X, Trash2 } from "lucide-react";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  checkDuplicateCustomer,
  type CustomerFormState,
} from "./actions";
import { getCountries, getStates, getCities } from "@/lib/location";
import { IconButton } from "@/components/IconButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { showMessage } from "@/components/MessageBar";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { useCustomersTopBar } from "./CustomersTopBarContext";

export type Customer = {
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

export function CustomerForm({
  customer,
  companyId,
  onSuccess,
  onCancel,
  listHref,
  returnToSpreadsheet,
}: {
  customer: Customer | null;
  companyId: string;
  onSuccess: (customerId?: string) => void;
  onCancel: () => void;
  /** URL for list view; used for redirect after delete. */
  listHref?: string;
  /** When true, after delete navigate to spreadsheet view instead of list. */
  returnToSpreadsheet?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<CustomerFormState>({});
  const [selectedCountry, setSelectedCountry] = useState(customer?.country ?? "Pakistan");
  const [selectedProvince, setSelectedProvince] = useState(customer?.province ?? "");
  const [selectedCity, setSelectedCity] = useState(customer?.city ?? "");
  const isCreate = !customer;
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { setBarState } = useCustomersTopBar();
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<FormData | null>(null);

  const countryOptions = getCountries();
  const stateOptions = getStates(selectedCountry);
  const cityOptions = getCities(selectedCountry, selectedProvince);

  async function doSubmit(formData: FormData) {
    setLoading(true);
    setState({});
    startGlobalProcessing(isCreate ? "Creating customer…" : "Saving customer…");
    try {
      if (isCreate) {
        const result = await createCustomer(companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Customer added." });
        onSuccess((result as { customerId?: string }).customerId);
      } else {
        const result = await updateCustomer(customer.id, companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Customer saved." });
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
      setState({ error: "Customer name is required." });
      return;
    }
    const ntn_cnic = (formData.get("ntn_cnic") as string)?.trim() || null;
    const { duplicate } = await checkDuplicateCustomer(
      companyId,
      name,
      ntn_cnic,
      customer?.id
    );
    if (duplicate) {
      setDuplicateConfirm(formData);
      return;
    }
    await doSubmit(formData);
  }

  async function handleDelete() {
    if (!customer) return;
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteCustomer(customer.id, companyId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Customer deleted." });
      router.push(listHref ?? (returnToSpreadsheet ? "/dashboard/customers?view=spreadsheet" : "/dashboard/customers"));
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
            label={loading ? "Saving…" : isCreate ? "Add customer" : "Save"}
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
          <label htmlFor="customer-contact_person_name" className={labelClass}>
            Contact person name
          </label>
          <input
            id="customer-contact_person_name"
            name="contact_person_name"
            type="text"
            defaultValue={customer?.contact_person_name ?? ""}
            className={inputClass}
            placeholder="e.g. John Smith"
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
        <div>
          <label htmlFor="customer-country" className={labelClass}>
            Country
          </label>
          <select
            id="customer-country"
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
          <label htmlFor="customer-province" className={labelClass}>
            Province / State
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
            disabled={!selectedCountry}
          >
            <option value="">— Select —</option>
            {stateOptions.map((s) => (
              <option key={s.isoCode} value={s.name}>{s.name}</option>
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
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
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
      </form>
      {!isCreate && (
        <ConfirmDialog
          open={!!deleteState}
          title="Delete customer?"
          message="This customer will be removed. This cannot be undone. Customers with estimates or invoices cannot be deleted."
          confirmLabel="Delete"
          variant="danger"
          loading={deleteState?.loading ?? false}
          onConfirm={handleDelete}
          onCancel={() => setDeleteState(null)}
        />
      )}
      <ConfirmDialog
        open={!!duplicateConfirm}
        title="Duplicate customer?"
        message="A customer with this name or NTN already exists. Save anyway?"
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
