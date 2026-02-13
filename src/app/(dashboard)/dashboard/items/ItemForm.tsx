"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, X, Trash2 } from "lucide-react";
import {
  createItem,
  updateItem,
  deleteItem,
  type ItemFormState,
} from "./actions";
import type { TaxRateOption, UomOption } from "./actions";
import { IconButton } from "@/components/IconButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { useItemsTopBar } from "./ItemsTopBarContext";
import { useItemsDataOrNull } from "./ItemsDataContext";

export type Item = {
  id: string;
  name: string;
  description: string | null;
  reference: string | null;
  hs_code: string | null;
  unit_rate: number | null;
  default_tax_rate_id: string | null;
  uom_id: string | null;
  uom_code?: string | null;
  sale_type: string | null;
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

export function ItemForm({
  item,
  companyId,
  taxRates,
  uomList,
  onSuccess,
  onCancel,
  listHref,
  returnToSpreadsheet,
}: {
  item: Item | null;
  companyId: string;
  taxRates: TaxRateOption[];
  uomList: UomOption[];
  onSuccess: (itemId?: string) => void;
  onCancel: () => void;
  listHref?: string;
  returnToSpreadsheet?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ItemFormState>({});
  const isCreate = !item;
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { setBarState } = useItemsTopBar();
  const itemsData = useItemsDataOrNull();
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);

  async function doSubmit(formData: FormData) {
    setLoading(true);
    setState({});
    startGlobalProcessing(isCreate ? "Creating item…" : "Saving item…");
    try {
      if (isCreate) {
        const result = await createItem(companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Item added." });
        onSuccess((result as { itemId?: string }).itemId);
      } else {
        const result = await updateItem(item.id, companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Item saved." });
        onSuccess();
      }
    } finally {
      endGlobalProcessing();
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteItem(item.id, companyId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Item deleted." });
      itemsData?.refreshItems?.();
      router.push(listHref ?? (returnToSpreadsheet ? "/dashboard/items?view=spreadsheet" : "/dashboard/items"));
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
            label={loading ? "Saving…" : isCreate ? "Add item" : "Save"}
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
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          doSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-6"
      >
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
            <label htmlFor="item-reference" className={labelClass}>
              Item #
            </label>
            <input
              id="item-reference"
              name="reference"
              type="text"
              defaultValue={item?.reference ?? ""}
              className={inputClass}
              placeholder="e.g. SKU-001"
            />
          </div>
          <div>
            <label htmlFor="item-name" className={labelClass}>
              Description <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="item-name"
              name="name"
              type="text"
              required
              defaultValue={item?.name ?? ""}
              className={inputClass}
              placeholder="e.g. Steel sheet 1mm"
            />
          </div>
          <div>
            <label htmlFor="item-description" className={labelClass}>
              Additional notes
            </label>
            <textarea
              id="item-description"
              name="description"
              rows={2}
              defaultValue={item?.description ?? ""}
              className={inputClass + " resize-y"}
              placeholder="Product or service description"
            />
          </div>
          <div>
            <label htmlFor="item-hs_code" className={labelClass}>
              HS Code
            </label>
            <input
              id="item-hs_code"
              name="hs_code"
              type="text"
              defaultValue={item?.hs_code ?? ""}
              className={inputClass}
              placeholder="e.g. 7208.10"
            />
          </div>
        </Section>

        <Section title="Pricing & Tax">
          <div>
            <label htmlFor="item-uom_id" className={labelClass}>
              UOM
            </label>
            <select
              id="item-uom_id"
              name="uom_id"
              defaultValue={item?.uom_id ?? uomList.find((u) => u.code === "Nos")?.id ?? ""}
              className={inputClass + " min-h-[42px] cursor-pointer"}
            >
              <option value="">— Select —</option>
              {uomList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="item-unit_rate" className={labelClass}>
              Unit price
            </label>
            <input
              id="item-unit_rate"
              name="unit_rate"
              type="number"
              min={0}
              step="0.01"
              defaultValue={item?.unit_rate != null ? String(item.unit_rate) : ""}
              className={inputClass + " input-no-spinner"}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Pre-fills unit price when this item is selected in estimates or invoices.
            </p>
          </div>
          <div>
            <label htmlFor="item-default_tax_rate_id" className={labelClass}>
              Default tax rate
            </label>
            <select
              id="item-default_tax_rate_id"
              name="default_tax_rate_id"
              defaultValue={item?.default_tax_rate_id ?? ""}
              className={inputClass + " min-h-[42px] cursor-pointer"}
            >
              <option value="">— None —</option>
              {taxRates.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.rate_label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="item-sale_type" className={labelClass}>
              Sale type
            </label>
            <input
              id="item-sale_type"
              name="sale_type"
              type="text"
              defaultValue={item?.sale_type ?? "Goods at standard rate (default)"}
              className={inputClass}
              placeholder="Goods at standard rate (default)"
            />
          </div>
        </Section>
      </form>
      {!isCreate && (
        <ConfirmDialog
          open={!!deleteState}
          title="Delete item?"
          message="This item will be removed. This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          loading={deleteState?.loading ?? false}
          onConfirm={handleDelete}
          onCancel={() => setDeleteState(null)}
        />
      )}
    </>
  );
}
