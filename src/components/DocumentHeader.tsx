"use client";

export type CompanyForDocument = {
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
};

export function DocumentHeader({
  company,
  docType,
  docNumber,
  docDate,
}: {
  company: CompanyForDocument;
  docType: "estimate" | "invoice";
  docNumber: string | null;
  docDate: string | null;
}) {
  const addressParts = [company.address, company.city, company.province].filter(Boolean);
  const addressLine = addressParts.length > 0 ? addressParts.join(", ") : null;

  return (
    <div className="border-b border-[var(--color-outline)] pb-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt=""
              className="mb-2 h-10 w-auto object-contain"
              aria-hidden
            />
          )}
          <h1 className="text-xl font-semibold text-[var(--color-on-surface)]">
            {company.name}
          </h1>
          {addressLine && (
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              {addressLine}
            </p>
          )}
          {(company.phone || company.email) && (
            <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
              {[company.phone, company.email].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
            {docType === "estimate" ? "ESTIMATE" : "INVOICE"}
          </p>
          <dl className="mt-2 space-y-0.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-[var(--color-on-surface-variant)]">
                {docType === "estimate" ? "Estimate no." : "Invoice no."}:
              </dt>
              <dd className="font-medium text-[var(--color-on-surface)]">
                {docNumber ?? "Draft"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[var(--color-on-surface-variant)]">Date:</dt>
              <dd className="font-medium text-[var(--color-on-surface)]">
                {docDate ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
