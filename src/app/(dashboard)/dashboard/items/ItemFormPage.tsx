"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ItemForm, type Item } from "./ItemForm";
import { ItemsTopBar } from "./ItemsTopBar";
import { useItemsDataOrNull } from "./ItemsDataContext";

export function ItemFormPage({
  item,
  companyId,
  taxRates,
  uomList,
  title,
  backHref,
  listHref,
  returnToSpreadsheet,
}: {
  item: Item | null;
  companyId: string;
  taxRates: { id: string; rate_value: number; rate_label: string }[];
  uomList: { id: string; code: string; description: string }[];
  title: string;
  backHref: string;
  listHref?: string;
  returnToSpreadsheet?: boolean;
}) {
  const router = useRouter();
  const itemsData = useItemsDataOrNull();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ItemsTopBar
        left={
          <>
            <Link
              href={backHref}
              className="btn btn-secondary btn-icon shrink-0"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
              {title}
            </h2>
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-base p-6">
        <div className="card max-w-2xl p-6">
          <ItemForm
            item={item}
            companyId={companyId}
            taxRates={taxRates}
            uomList={uomList}
            listHref={listHref}
            returnToSpreadsheet={returnToSpreadsheet}
            onSuccess={(itemId) => {
              itemsData?.refreshItems?.();
              const base = listHref ?? "/dashboard/items";
              const qs = base.includes("?") ? base.split("?")[1] : "";
              const query = qs ? `?${qs}` : "";
              if (itemId) {
                router.push(`/dashboard/items/${itemId}${query}`);
              } else if (item?.id) {
                router.push(`/dashboard/items/${item.id}${query}`);
              } else {
                router.push(base);
              }
              router.refresh();
            }}
            onCancel={() => {
              if (!item) itemsData?.refreshItems?.();
              if (item?.id) router.push(backHref);
              else router.push(listHref ?? "/dashboard/items");
            }}
          />
        </div>
      </div>
    </div>
  );
}
