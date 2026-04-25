import { format } from "date-fns";
import type { Invoice, ReconciliationResult } from "@/lib/types";

interface MonthlyTotals {
  month: string;
  invoiceAmount: number;
  payoutAmount: number;
  discrepancyCount: number;
}

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildTaxReport(result: ReconciliationResult, invoices: Invoice[]) {
  const bucket = new Map<string, MonthlyTotals>();

  for (const invoice of invoices) {
    const key = format(new Date(invoice.issuedDate), "yyyy-MM");
    const existing =
      bucket.get(key) ??
      ({
        month: key,
        invoiceAmount: 0,
        payoutAmount: 0,
        discrepancyCount: 0
      } satisfies MonthlyTotals);

    existing.invoiceAmount += invoice.amount;
    bucket.set(key, existing);
  }

  for (const row of result.rows) {
    const dateSource = row.payoutDate ?? row.invoiceDate;
    if (!dateSource) {
      continue;
    }

    const key = format(new Date(dateSource), "yyyy-MM");
    const existing =
      bucket.get(key) ??
      ({
        month: key,
        invoiceAmount: 0,
        payoutAmount: 0,
        discrepancyCount: 0
      } satisfies MonthlyTotals);

    existing.payoutAmount += row.payoutAmount ?? 0;

    if (row.status !== "matched") {
      existing.discrepancyCount += 1;
    }

    bucket.set(key, existing);
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: result.summary,
    monthly: [...bucket.values()].sort((a, b) => a.month.localeCompare(b.month)),
    rows: result.rows
  };
}

export function buildCsvReport(result: ReconciliationResult): string {
  const header = [
    "status",
    "confidence",
    "invoice_number",
    "invoice_date",
    "invoice_amount",
    "payout_id",
    "payout_date",
    "payout_amount",
    "difference",
    "notes"
  ];

  const lines = result.rows.map((row) =>
    [
      row.status,
      row.confidence,
      row.invoiceNumber ?? "",
      row.invoiceDate ?? "",
      row.invoiceAmount ?? "",
      row.payoutId ?? "",
      row.payoutDate ?? "",
      row.payoutAmount ?? "",
      row.difference,
      row.notes
    ]
      .map(escapeCsv)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}
