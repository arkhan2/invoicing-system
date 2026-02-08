"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CustomerForm, type Customer } from "./CustomerForm";
import { CustomersTopBar } from "./CustomersTopBar";

export function CustomerFormPage({
  customer,
  companyId,
  title,
  backHref,
}: {
  customer: Customer | null;
  companyId: string;
  title: string;
  backHref: string;
}) {
  const router = useRouter();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <CustomersTopBar
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
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-card-bg)] p-6">
        <div className="card max-w-2xl p-6">
          <CustomerForm
            customer={customer}
            companyId={companyId}
            onSuccess={(customerId) => {
              if (customerId) router.push(`/dashboard/customers/${customerId}`);
              else router.push("/dashboard/customers");
              router.refresh();
            }}
            onCancel={() => {
              if (customer?.id) router.push(`/dashboard/customers/${customer.id}`);
              else router.push("/dashboard/customers");
            }}
          />
        </div>
      </div>
    </div>
  );
}
