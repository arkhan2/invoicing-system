"use client";

import { useState } from "react";
import { CompanyView } from "./CompanyView";
import { CompanyForm } from "./CompanyForm";
import type { TaxRateRow } from "./actions";

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

export function CompanyProfile({
  company,
  salesTaxRates,
  withholdingTaxRates,
}: {
  company: Company | null;
  salesTaxRates: TaxRateRow[];
  withholdingTaxRates: TaxRateRow[];
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (!company) {
    return (
      <CompanyForm
        company={null}
        salesTaxRates={salesTaxRates}
        withholdingTaxRates={withholdingTaxRates}
      />
    );
  }

  if (isEditing) {
    return (
      <CompanyForm
        company={company}
        salesTaxRates={salesTaxRates}
        withholdingTaxRates={withholdingTaxRates}
        onSaved={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <CompanyView
      company={company}
      salesTaxRates={salesTaxRates}
      withholdingTaxRates={withholdingTaxRates}
      onEdit={() => setIsEditing(true)}
    />
  );
}
