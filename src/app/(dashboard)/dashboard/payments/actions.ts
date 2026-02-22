"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const PAYMENT_NUMBER_DIGITS = 5;

export type CreateCustomerPaymentPayload = {
  customer_id: string;
  payment_date: string;
  payment_received_date?: string | null;
  mode_of_payment: string;
  gross_amount: number;
  withholding_tax_rate_id?: string | null;
  withholding_amount: number;
  net_amount: number;
  reference_payment_id?: string | null;
  notes?: string | null;
};

/** Payment data for pre-filling the edit form. */
export type PaymentForEdit = {
  payment_number: string;
  customer_id: string;
  payment_date: string;
  payment_received_date: string | null;
  mode_of_payment: string;
  gross_amount: number;
  withholding_tax_rate_id: string | null;
  withholding_amount: number;
  net_amount: number;
  reference_payment_id: string | null;
  notes: string | null;
};

export type PaymentListItem = {
  id: string;
  payment_number: string;
  customer_id: string;
  customer_name: string;
  payment_date: string;
  payment_received_date: string | null;
  gross_amount: number;
  withholding_amount: number;
  net_amount: number;
  allocated_amount: number;
  status: string;
};

export type UnpaidInvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  outstanding_balance: number;
};

export type InvoicePaymentSummary = {
  outstanding_balance: number;
  paid_amount: number;
  allocations: { id: string; payment_number: string; payment_date: string; allocated_amount: number }[];
};

async function getCompanyForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  userId: string
): Promise<{ id: string; payment_prefix: string | null; payment_next_number: number | null } | null> {
  const { data } = await supabase
    .from("companies")
    .select("id, payment_prefix, payment_next_number")
    .eq("id", companyId)
    .eq("user_id", userId)
    .single();
  if (!data) return null;
  const d = data as { id: string; payment_prefix?: string | null; payment_next_number?: number | null };
  return { id: d.id, payment_prefix: d.payment_prefix ?? null, payment_next_number: d.payment_next_number ?? null };
}

async function getNextPaymentNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  userId: string
): Promise<{ payment_number: string; next_number: number } | null> {
  const company = await getCompanyForUser(supabase, companyId, userId);
  if (!company) return null;
  const prefix = (company.payment_prefix ?? "PAY").trim() || "PAY";
  const next = Math.max(1, Number(company.payment_next_number) || 1);
  const payment_number = `${prefix}-${String(next).padStart(PAYMENT_NUMBER_DIGITS, "0")}`;
  return { payment_number, next_number: next };
}

export async function createCustomerPayment(
  companyId: string,
  payload: CreateCustomerPaymentPayload
): Promise<{ error?: string; paymentId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const company = await getCompanyForUser(supabase, companyId, user.id);
  if (!company) return { error: "Company not found." };

  const nextInfo = await getNextPaymentNumber(supabase, companyId, user.id);
  if (!nextInfo) return { error: "Could not generate payment number." };

  const { payment_number, next_number } = nextInfo;
  const net_amount = Number(payload.net_amount);
  const gross_amount = Number(payload.gross_amount);
  const withholding_amount = Number(payload.withholding_amount) || 0;
  if (gross_amount <= 0) return { error: "Gross amount must be positive." };
  if (net_amount <= 0) return { error: "Net amount must be positive." };

  const { data: payment, error: insertErr } = await supabase
    .from("customer_payments")
    .insert({
      company_id: companyId,
      customer_id: payload.customer_id,
      payment_number,
      payment_date: payload.payment_date,
      payment_received_date: payload.payment_received_date?.trim() || null,
      mode_of_payment: payload.mode_of_payment,
      gross_amount,
      withholding_tax_rate_id: payload.withholding_tax_rate_id || null,
      withholding_amount,
      net_amount,
      reference_payment_id: payload.reference_payment_id?.trim() || null,
      notes: payload.notes?.trim() || null,
      status: "Unallocated",
    })
    .select("id")
    .single();

  if (insertErr) return { error: insertErr.message };
  if (!payment) return { error: "Failed to create payment." };

  await supabase
    .from("companies")
    .update({ payment_next_number: next_number + 1, updated_at: new Date().toISOString() })
    .eq("id", companyId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/payments");
  return { paymentId: payment.id };
}

export async function getPaymentForEdit(
  companyId: string,
  paymentId: string
): Promise<PaymentForEdit | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return null;

  const { data: row } = await supabase
    .from("customer_payments")
    .select("payment_number, customer_id, payment_date, payment_received_date, mode_of_payment, gross_amount, withholding_tax_rate_id, withholding_amount, net_amount, reference_payment_id, notes")
    .eq("id", paymentId)
    .eq("company_id", companyId)
    .single();
  if (!row) return null;

  return {
    payment_number: row.payment_number as string,
    customer_id: row.customer_id as string,
    payment_date: row.payment_date as string,
    payment_received_date: (row.payment_received_date as string) ?? null,
    mode_of_payment: (row.mode_of_payment as string) ?? "Cheque",
    gross_amount: Number(row.gross_amount),
    withholding_tax_rate_id: row.withholding_tax_rate_id as string | null,
    withholding_amount: Number(row.withholding_amount),
    net_amount: Number(row.net_amount),
    reference_payment_id: (row.reference_payment_id as string) ?? null,
    notes: (row.notes as string) ?? null,
  };
}

export async function updateCustomerPayment(
  companyId: string,
  paymentId: string,
  payload: CreateCustomerPaymentPayload
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: existing } = await supabase
    .from("customer_payments")
    .select("id")
    .eq("id", paymentId)
    .eq("company_id", companyId)
    .single();
  if (!existing) return { error: "Payment not found." };

  const net_amount = Number(payload.net_amount);
  const gross_amount = Number(payload.gross_amount);
  const withholding_amount = Number(payload.withholding_amount) || 0;
  if (gross_amount <= 0) return { error: "Gross amount must be positive." };
  if (net_amount <= 0) return { error: "Net amount must be positive." };

  const { error } = await supabase
    .from("customer_payments")
    .update({
      customer_id: payload.customer_id,
      payment_date: payload.payment_date,
      payment_received_date: payload.payment_received_date?.trim() || null,
      mode_of_payment: payload.mode_of_payment,
      gross_amount,
      withholding_tax_rate_id: payload.withholding_tax_rate_id || null,
      withholding_amount,
      net_amount,
      reference_payment_id: payload.reference_payment_id?.trim() || null,
      notes: payload.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/sales");
  return {};
}

export async function getCustomerPayments(
  companyId: string,
  page: number,
  perPage: number,
  filters?: { customerId?: string | null; status?: string | null }
): Promise<{ totalCount: number; list: PaymentListItem[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalCount: 0, list: [] };

  const company = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company.data) return { totalCount: 0, list: [] };

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("customer_payments")
    .select(
      `
      id,
      payment_number,
      customer_id,
      payment_date,
      payment_received_date,
      gross_amount,
      withholding_amount,
      net_amount,
      status,
      customer:customers(id, name)
    `,
      { count: "exact" }
    )
    .eq("company_id", companyId)
    .order("payment_date", { ascending: false });

  if (filters?.customerId?.trim()) {
    query = query.eq("customer_id", filters.customerId.trim());
  }
  if (filters?.status?.trim()) {
    query = query.eq("status", filters.status.trim());
  }

  const { data: rows, count, error } = await query.range(from, to);

  if (error) return { totalCount: 0, list: [] };

  const paymentIds = (rows ?? []).map((r) => r.id);
  if (paymentIds.length === 0) {
    return {
      totalCount: count ?? 0,
      list: (rows ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        payment_number: r.payment_number as string,
        customer_id: r.customer_id as string,
        customer_name: (r.customer as { name?: string })?.name ?? "",
        payment_date: r.payment_date as string,
        payment_received_date: (r.payment_received_date as string) ?? null,
        gross_amount: Number(r.gross_amount),
        withholding_amount: Number(r.withholding_amount),
        net_amount: Number(r.net_amount),
        allocated_amount: 0,
        status: r.status as string,
      })),
    };
  }

  const { data: allocRows } = await supabase
    .from("customer_payment_allocations")
    .select("payment_id, allocated_amount")
    .in("payment_id", paymentIds);

  const allocatedByPayment: Record<string, number> = {};
  for (const a of allocRows ?? []) {
    const pid = a.payment_id as string;
    allocatedByPayment[pid] = (allocatedByPayment[pid] ?? 0) + Number(a.allocated_amount);
  }

  const list: PaymentListItem[] = (rows ?? []).map((r: Record<string, unknown>) => {
    const gross = Number(r.gross_amount);
    const alloc = allocatedByPayment[r.id as string] ?? 0;
    const status = recomputePaymentStatus(alloc, gross);
    return {
      id: r.id as string,
      payment_number: r.payment_number as string,
      customer_id: r.customer_id as string,
      customer_name: (r.customer as { name?: string })?.name ?? "",
      payment_date: r.payment_date as string,
      payment_received_date: (r.payment_received_date as string) ?? null,
      gross_amount: gross,
      withholding_amount: Number(r.withholding_amount),
      net_amount: Number(r.net_amount),
      allocated_amount: alloc,
      status,
    };
  });

  return { totalCount: count ?? 0, list };
}

/** Payment data for the read-only detail view (display mode). */
export type PaymentDetailData = PaymentListItem & {
  mode_of_payment: string;
  reference_payment_id: string | null;
  notes: string | null;
};

/** Single payment by id for the detail view page. */
export async function getPaymentForView(
  companyId: string,
  paymentId: string
): Promise<PaymentDetailData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return null;

  const { data: row } = await supabase
    .from("customer_payments")
    .select("id, payment_number, customer_id, payment_date, payment_received_date, mode_of_payment, gross_amount, withholding_amount, net_amount, reference_payment_id, notes, status, customer:customers(id, name)")
    .eq("id", paymentId)
    .eq("company_id", companyId)
    .single();
  if (!row) return null;

  const { data: allocRows } = await supabase
    .from("customer_payment_allocations")
    .select("allocated_amount")
    .eq("payment_id", paymentId);
  const allocated_amount = (allocRows ?? []).reduce((s, r) => s + Number(r.allocated_amount), 0);
  const gross = Number(row.gross_amount);
  const status = recomputePaymentStatus(allocated_amount, gross);

  return {
    id: row.id as string,
    payment_number: row.payment_number as string,
    customer_id: row.customer_id as string,
    customer_name: (row.customer as { name?: string })?.name ?? "",
    payment_date: row.payment_date as string,
    payment_received_date: (row.payment_received_date as string) ?? null,
    gross_amount: gross,
    withholding_amount: Number(row.withholding_amount),
    net_amount: Number(row.net_amount),
    allocated_amount,
    status,
    mode_of_payment: (row.mode_of_payment as string) ?? "Cheque",
    reference_payment_id: (row.reference_payment_id as string) ?? null,
    notes: (row.notes as string) ?? null,
  };
}

/** Single payment by id for allocate page. */
export async function getPaymentById(
  companyId: string,
  paymentId: string
): Promise<PaymentListItem | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return null;

  const { data: row } = await supabase
    .from("customer_payments")
    .select("id, payment_number, customer_id, payment_date, payment_received_date, gross_amount, withholding_amount, net_amount, status, customer:customers(id, name)")
    .eq("id", paymentId)
    .eq("company_id", companyId)
    .single();
  if (!row) return null;

  const { data: allocRows } = await supabase
    .from("customer_payment_allocations")
    .select("allocated_amount")
    .eq("payment_id", paymentId);
  const allocated_amount = (allocRows ?? []).reduce((s, r) => s + Number(r.allocated_amount), 0);
  const gross = Number(row.gross_amount);
  const status = recomputePaymentStatus(allocated_amount, gross);

  return {
    id: row.id as string,
    payment_number: row.payment_number as string,
    customer_id: row.customer_id as string,
    customer_name: (row.customer as { name?: string })?.name ?? "",
    payment_date: row.payment_date as string,
    payment_received_date: (row.payment_received_date as string) ?? null,
    gross_amount: gross,
    withholding_amount: Number(row.withholding_amount),
    net_amount: Number(row.net_amount),
    allocated_amount,
    status,
  };
}

export async function getInvoiceOutstandingBalance(
  companyId: string,
  salesInvoiceId: string
): Promise<{ error?: string; total_amount?: number; paid_amount?: number; outstanding_balance?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, company_id, status, total_amount")
    .eq("id", salesInvoiceId)
    .eq("company_id", companyId)
    .single();
  if (!invoice) return { error: "Invoice not found." };

  const { data: summary } = await supabase
    .from("sales_invoice_allocations_summary")
    .select("paid_amount")
    .eq("sales_invoice_id", salesInvoiceId)
    .maybeSingle();

  const total_amount = Number(invoice.total_amount) ?? 0;
  const paid_amount = summary ? Number(summary.paid_amount) : 0;
  const outstanding_balance = Math.max(0, total_amount - paid_amount);

  return { total_amount, paid_amount, outstanding_balance };
}

/** Unpaid invoices for a single customer only (e.g. for allocating a payment made by that customer). */
export async function getUnpaidInvoicesForCustomer(
  companyId: string,
  customerId: string
): Promise<UnpaidInvoiceRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return [];

  if (!customerId?.trim()) return [];

  const { data: invoices } = await supabase
    .from("sales_invoices")
    .select("id, invoice_number, invoice_date, total_amount")
    .eq("company_id", companyId)
    .eq("customer_id", customerId.trim())
    .in("status", ["Final", "Sent"]);

  if (!invoices?.length) return [];

  const ids = invoices.map((i) => i.id);
  const { data: summaryRows } = await supabase
    .from("sales_invoice_allocations_summary")
    .select("sales_invoice_id, paid_amount")
    .in("sales_invoice_id", ids);

  const paidByInvoice: Record<string, number> = {};
  for (const s of summaryRows ?? []) {
    paidByInvoice[s.sales_invoice_id] = Number(s.paid_amount);
  }

  const result: UnpaidInvoiceRow[] = [];
  for (const inv of invoices) {
    const total = Number(inv.total_amount) ?? 0;
    const paid = paidByInvoice[inv.id] ?? 0;
    const outstanding = Math.max(0, total - paid);
    if (outstanding > 0) {
      result.push({
        id: inv.id,
        invoice_number: inv.invoice_number ?? "",
        invoice_date: inv.invoice_date ?? "",
        total_amount: total,
        outstanding_balance: outstanding,
      });
    }
  }
  result.sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));
  return result;
}

/** Payment status is based on gross amount allocated (invoice is reduced by gross). */
function recomputePaymentStatus(
  allocatedTotal: number,
  grossAmount: number
): "Unallocated" | "Partially Allocated" | "Allocated" {
  if (allocatedTotal <= 0) return "Unallocated";
  if (allocatedTotal >= grossAmount) return "Allocated";
  return "Partially Allocated";
}

export async function allocatePaymentToInvoice(
  companyId: string,
  paymentId: string,
  salesInvoiceId: string,
  amount: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return { error: "Amount must be positive." };

  const { data: payment } = await supabase
    .from("customer_payments")
    .select("id, company_id, customer_id, gross_amount")
    .eq("id", paymentId)
    .eq("company_id", companyId)
    .single();
  if (!payment) return { error: "Payment not found." };

  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, company_id, status")
    .eq("id", salesInvoiceId)
    .eq("company_id", companyId)
    .single();
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status !== "Final" && invoice.status !== "Sent") {
    return { error: "Only Final or Sent invoices can receive allocations." };
  }

  const { data: allocRows } = await supabase
    .from("customer_payment_allocations")
    .select("allocated_amount")
    .eq("payment_id", paymentId);
  const currentAlloc = (allocRows ?? []).reduce((s, r) => s + Number(r.allocated_amount), 0);
  const paymentRemaining = Math.max(0, Number(payment.gross_amount) - currentAlloc);
  if (paymentRemaining <= 0) return { error: "Payment is fully allocated. No further allocation is possible." };
  if (amt > paymentRemaining) return { error: "Amount exceeds payment remaining." };

  const { data: summary } = await supabase
    .from("sales_invoice_allocations_summary")
    .select("paid_amount")
    .eq("sales_invoice_id", salesInvoiceId)
    .maybeSingle();
  const paid = summary ? Number(summary.paid_amount) : 0;
  const totalAmount = await supabase
    .from("sales_invoices")
    .select("total_amount")
    .eq("id", salesInvoiceId)
    .single()
    .then((r) => Number(r.data?.total_amount ?? 0));
  const invoiceBalance = Math.max(0, totalAmount - paid);
  if (amt > invoiceBalance) return { error: "Amount exceeds invoice outstanding balance." };

  const { error: insertErr } = await supabase.from("customer_payment_allocations").insert({
    company_id: companyId,
    payment_id: paymentId,
    sales_invoice_id: salesInvoiceId,
    allocated_amount: amt,
  });
  if (insertErr) return { error: insertErr.message };

  const newAllocTotal = currentAlloc + amt;
  const newStatus = recomputePaymentStatus(newAllocTotal, Number(payment.gross_amount));
  await supabase
    .from("customer_payments")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("company_id", companyId);

  revalidatePath("/dashboard/payments");
  revalidatePath(`/dashboard/sales/${salesInvoiceId}`);
  revalidatePath("/dashboard/sales");
  return {};
}

export async function removeAllocation(
  companyId: string,
  allocationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: alloc } = await supabase
    .from("customer_payment_allocations")
    .select("id, payment_id")
    .eq("id", allocationId)
    .eq("company_id", companyId)
    .single();
  if (!alloc) return { error: "Allocation not found." };

  const { error: delErr } = await supabase
    .from("customer_payment_allocations")
    .delete()
    .eq("id", allocationId)
    .eq("company_id", companyId);
  if (delErr) return { error: delErr.message };

  const { data: payment } = await supabase
    .from("customer_payments")
    .select("gross_amount")
    .eq("id", alloc.payment_id)
    .single();
  if (payment) {
    const { data: remaining } = await supabase
      .from("customer_payment_allocations")
      .select("allocated_amount")
      .eq("payment_id", alloc.payment_id);
    const total = (remaining ?? []).reduce((s, r) => s + Number(r.allocated_amount), 0);
    const newStatus = recomputePaymentStatus(total, Number(payment.gross_amount));
    await supabase
      .from("customer_payments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", alloc.payment_id)
      .eq("company_id", companyId);
  }

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/sales");
  return {};
}

export async function deletePayment(
  companyId: string,
  paymentId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: payment } = await supabase
    .from("customer_payments")
    .select("id")
    .eq("id", paymentId)
    .eq("company_id", companyId)
    .single();
  if (!payment) return { error: "Payment not found." };

  const { error } = await supabase
    .from("customer_payments")
    .delete()
    .eq("id", paymentId)
    .eq("company_id", companyId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/sales");
  return {};
}

export async function getInvoicePaymentSummary(
  companyId: string,
  salesInvoiceId: string
): Promise<{ error?: string } & InvoicePaymentSummary> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", outstanding_balance: 0, paid_amount: 0, allocations: [] };

  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, company_id, total_amount")
    .eq("id", salesInvoiceId)
    .eq("company_id", companyId)
    .single();
  if (!invoice) return { error: "Invoice not found.", outstanding_balance: 0, paid_amount: 0, allocations: [] };

  const { data: summary } = await supabase
    .from("sales_invoice_allocations_summary")
    .select("paid_amount")
    .eq("sales_invoice_id", salesInvoiceId)
    .maybeSingle();

  const total_amount = Number(invoice.total_amount) ?? 0;
  const paid_amount = summary ? Number(summary.paid_amount) : 0;
  const outstanding_balance = Math.max(0, total_amount - paid_amount);

  const { data: allocRows } = await supabase
    .from("customer_payment_allocations")
    .select("id, allocated_amount, payment:customer_payments(payment_number, payment_date)")
    .eq("sales_invoice_id", salesInvoiceId)
    .eq("company_id", companyId);

  const allocations = (allocRows ?? []).map((r: Record<string, unknown>) => {
    const p = r.payment as { payment_number?: string; payment_date?: string };
    return {
      id: r.id as string,
      payment_number: p?.payment_number ?? "",
      payment_date: p?.payment_date ?? "",
      allocated_amount: Number(r.allocated_amount),
    };
  });

  return { outstanding_balance, paid_amount, allocations };
}

/** Payments available to allocate for a customer (Unallocated or Partially Allocated). Remaining is gross-based (invoice is reduced by gross). */
export async function getAvailablePaymentsForCustomer(
  companyId: string,
  customerId: string
): Promise<{ id: string; payment_number: string; payment_date: string; gross_amount: number; allocated_amount: number; remaining: number }[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: payments } = await supabase
    .from("customer_payments")
    .select("id, payment_number, payment_date, gross_amount")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .in("status", ["Unallocated", "Partially Allocated"]);

  if (!payments?.length) return [];

  const paymentIds = payments.map((p) => p.id);
  const { data: allocRows } = await supabase
    .from("customer_payment_allocations")
    .select("payment_id, allocated_amount")
    .in("payment_id", paymentIds);

  const allocatedByPayment: Record<string, number> = {};
  for (const a of allocRows ?? []) {
    const pid = a.payment_id as string;
    allocatedByPayment[pid] = (allocatedByPayment[pid] ?? 0) + Number(a.allocated_amount);
  }

  return payments.map((p) => {
    const gross = Number(p.gross_amount);
    const alloc = allocatedByPayment[p.id] ?? 0;
    return {
      id: p.id,
      payment_number: p.payment_number ?? "",
      payment_date: p.payment_date ?? "",
      gross_amount: gross,
      allocated_amount: alloc,
      remaining: Math.max(0, gross - alloc),
    };
  });
}
