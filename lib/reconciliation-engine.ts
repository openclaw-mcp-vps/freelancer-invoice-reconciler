import { differenceInCalendarDays } from "date-fns";
import { createId } from "@/lib/database";
import type {
  Invoice,
  Payout,
  ReconciliationResult,
  ReconciliationRow,
  ReconciliationStatus
} from "@/lib/types";

interface Candidate {
  payout: Payout;
  amountGap: number;
  dayGap: number;
  score: number;
}

function confidenceFromScore(score: number): number {
  const normalized = Math.max(0, Math.min(1, 1 - score / 100));
  return Number((normalized * 100).toFixed(1));
}

function classifyStatus(amountGap: number): ReconciliationStatus {
  if (amountGap <= 0.5) {
    return "matched";
  }

  return "amount_mismatch";
}

function buildCandidate(invoice: Invoice, payout: Payout): Candidate {
  const amountGap = Math.abs(invoice.amount - payout.amount);
  const dayGap = Math.abs(
    differenceInCalendarDays(new Date(payout.arrivalDate), new Date(invoice.issuedDate))
  );

  const score = amountGap * 30 + dayGap;

  return {
    payout,
    amountGap,
    dayGap,
    score
  };
}

function findBestPayoutMatch(invoice: Invoice, unmatchedPayouts: Payout[]) {
  const options = unmatchedPayouts
    .filter((payout) => payout.currency === invoice.currency)
    .map((payout) => buildCandidate(invoice, payout))
    .sort((a, b) => a.score - b.score);

  const top = options[0];

  if (!top) {
    return undefined;
  }

  if (top.dayGap > 30 && top.amountGap > 5) {
    return undefined;
  }

  return top;
}

function buildRow(params: {
  invoice?: Invoice;
  payout?: Payout;
  status: ReconciliationStatus;
  confidence: number;
  notes: string;
}): ReconciliationRow {
  const invoiceAmount = params.invoice?.amount;
  const payoutAmount = params.payout?.amount;

  return {
    id: createId("rec"),
    status: params.status,
    confidence: params.confidence,
    invoiceId: params.invoice?.id,
    invoiceNumber: params.invoice?.invoiceNumber,
    invoiceDate: params.invoice?.issuedDate,
    invoiceAmount,
    payoutId: params.payout?.id,
    payoutDate: params.payout?.arrivalDate,
    payoutAmount,
    difference: Number(((invoiceAmount ?? 0) - (payoutAmount ?? 0)).toFixed(2)),
    notes: params.notes
  };
}

export function reconcileInvoicesToPayouts(invoices: Invoice[], payouts: Payout[]): ReconciliationResult {
  const sortedInvoices = [...invoices].sort(
    (a, b) => +new Date(a.issuedDate) - +new Date(b.issuedDate)
  );
  const unmatchedPayouts = [...payouts];
  const rows: ReconciliationRow[] = [];

  for (const invoice of sortedInvoices) {
    const candidate = findBestPayoutMatch(invoice, unmatchedPayouts);

    if (!candidate) {
      rows.push(
        buildRow({
          invoice,
          status: "payout_missing",
          confidence: 0,
          notes: "No Stripe payout was close enough in amount and date window."
        })
      );
      continue;
    }

    const status = classifyStatus(candidate.amountGap);
    const confidence = confidenceFromScore(candidate.score);

    rows.push(
      buildRow({
        invoice,
        payout: candidate.payout,
        status,
        confidence,
        notes:
          status === "matched"
            ? "Invoice and payout amount align within tolerance."
            : "Likely match by date, but amount differs beyond tolerance."
      })
    );

    const matchIndex = unmatchedPayouts.findIndex((item) => item.id === candidate.payout.id);
    if (matchIndex >= 0) {
      unmatchedPayouts.splice(matchIndex, 1);
    }
  }

  for (const payout of unmatchedPayouts) {
    rows.push(
      buildRow({
        payout,
        status: "invoice_missing",
        confidence: 0,
        notes: "Stripe payout has no matching invoice in uploaded records."
      })
    );
  }

  const matchedCount = rows.filter((row) => row.status === "matched").length;
  const discrepancyCount = rows.length - matchedCount;
  const totalInvoiceAmount = Number(
    sortedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0).toFixed(2)
  );
  const totalPayoutAmount = Number(payouts.reduce((sum, payout) => sum + payout.amount, 0).toFixed(2));

  return {
    id: createId("result"),
    createdAt: new Date().toISOString(),
    rows,
    summary: {
      totalInvoices: invoices.length,
      totalPayouts: payouts.length,
      matchedCount,
      discrepancyCount,
      totalInvoiceAmount,
      totalPayoutAmount,
      unreconciledAmount: Number(Math.abs(totalInvoiceAmount - totalPayoutAmount).toFixed(2))
    }
  };
}
