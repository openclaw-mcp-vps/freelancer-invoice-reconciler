export type InvoiceSource = "csv" | "pdf" | "json" | "manual";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issuedDate: string;
  dueDate?: string;
  paidDate?: string;
  amount: number;
  currency: string;
  source: InvoiceSource;
  fileName?: string;
  notes?: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  amount: number;
  currency: string;
  arrivalDate: string;
  status: string;
  description?: string;
}

export type ReconciliationStatus =
  | "matched"
  | "amount_mismatch"
  | "invoice_missing"
  | "payout_missing";

export interface ReconciliationRow {
  id: string;
  status: ReconciliationStatus;
  confidence: number;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  payoutId?: string;
  payoutDate?: string;
  payoutAmount?: number;
  difference: number;
  notes: string;
}

export interface ReconciliationSummary {
  totalInvoices: number;
  totalPayouts: number;
  matchedCount: number;
  discrepancyCount: number;
  totalInvoiceAmount: number;
  totalPayoutAmount: number;
  unreconciledAmount: number;
}

export interface ReconciliationResult {
  id: string;
  createdAt: string;
  rows: ReconciliationRow[];
  summary: ReconciliationSummary;
}

export interface PurchaseRecord {
  id: string;
  email: string;
  amountTotal: number;
  currency: string;
  stripeSessionId: string;
  purchasedAt: string;
}

export interface UserRecord {
  id: string;
  email?: string;
  stripeAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseState {
  users: UserRecord[];
  invoicesByUser: Record<string, Invoice[]>;
  reconciliationsByUser: Record<string, ReconciliationResult[]>;
  purchases: PurchaseRecord[];
}
