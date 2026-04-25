import { Readable } from "node:stream";
import csvParser from "csv-parser";
import pdfParse from "pdf-parse";
import { isValid, parse, parseISO } from "date-fns";
import { createId } from "@/lib/database";
import type { Invoice } from "@/lib/types";

function normalizeAmount(raw: unknown): number {
  if (typeof raw === "number") {
    return Number(raw.toFixed(2));
  }

  const cleaned = String(raw ?? "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const parsed = Number.parseFloat(cleaned);
  if (Number.isFinite(parsed)) {
    return Number(parsed.toFixed(2));
  }

  return 0;
}

function normalizeDate(value: unknown): string {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return new Date().toISOString();
  }

  const candidates = [
    parseISO(raw),
    parse(raw, "yyyy-MM-dd", new Date()),
    parse(raw, "MM/dd/yyyy", new Date()),
    parse(raw, "dd/MM/yyyy", new Date())
  ];

  const parsed = candidates.find((candidate) => isValid(candidate));
  return parsed ? parsed.toISOString() : new Date().toISOString();
}

function mapCsvRowToInvoice(row: Record<string, unknown>, fileName: string): Invoice {
  const invoiceNumber =
    String(row.invoice_number ?? row.invoice ?? row.number ?? row.id ?? "") || createId("inv");
  const issuedDate = normalizeDate(row.issued_date ?? row.issue_date ?? row.date);

  return {
    id: createId("inv"),
    invoiceNumber,
    clientName: String(row.client ?? row.client_name ?? row.customer ?? "Unknown client"),
    issuedDate,
    dueDate: row.due_date ? normalizeDate(row.due_date) : undefined,
    paidDate: row.paid_date ? normalizeDate(row.paid_date) : undefined,
    amount: normalizeAmount(row.amount ?? row.total ?? row.value),
    currency: String(row.currency ?? "USD").toUpperCase(),
    source: "csv",
    fileName,
    notes: "Parsed from CSV upload",
    createdAt: new Date().toISOString()
  };
}

async function parseCsvInvoices(buffer: Buffer, fileName: string): Promise<Invoice[]> {
  const rows: Invoice[] = [];

  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer)
      .pipe(csvParser())
      .on("data", (row: Record<string, unknown>) => {
        rows.push(mapCsvRowToInvoice(row, fileName));
      })
      .on("end", () => resolve())
      .on("error", (error) => reject(error));
  });

  return rows;
}

function parsePdfTextToInvoice(text: string, fileName: string): Invoice {
  const invoiceNumberMatch = text.match(/invoice\s*(number|#)?\s*[:#-]?\s*([A-Z0-9-]+)/i);
  const amountMatch = text.match(/(?:total|amount\s*due)\s*[:$]?\s*([\d,.]+)/i);
  const clientMatch = text.match(/bill\s*to\s*[:\n]?\s*([A-Za-z0-9 &.,'-]+)/i);
  const dateMatch = text.match(/(?:issue\s*date|date)\s*[:\n]?\s*([0-9/-]+)/i);

  return {
    id: createId("inv"),
    invoiceNumber: invoiceNumberMatch?.[2] ?? createId("pdf"),
    clientName: clientMatch?.[1]?.trim() ?? "Unknown client",
    issuedDate: normalizeDate(dateMatch?.[1]),
    amount: normalizeAmount(amountMatch?.[1] ?? 0),
    currency: "USD",
    source: "pdf",
    fileName,
    notes: "Parsed from PDF upload",
    createdAt: new Date().toISOString()
  };
}

function parseJsonInvoices(raw: string, fileName: string): Invoice[] {
  const payload = JSON.parse(raw) as unknown;
  const records = Array.isArray(payload) ? payload : [payload];

  return records
    .filter((record): record is Record<string, unknown> => typeof record === "object" && !!record)
    .map((record) => ({
      id: createId("inv"),
      invoiceNumber:
        String(record.invoiceNumber ?? record.invoice_number ?? record.id ?? createId("json")) ||
        createId("json"),
      clientName: String(record.clientName ?? record.client ?? "Unknown client"),
      issuedDate: normalizeDate(record.issuedDate ?? record.issue_date ?? record.date),
      dueDate: record.dueDate ? normalizeDate(record.dueDate) : undefined,
      paidDate: record.paidDate ? normalizeDate(record.paidDate) : undefined,
      amount: normalizeAmount(record.amount ?? record.total ?? 0),
      currency: String(record.currency ?? "USD").toUpperCase(),
      source: "json",
      fileName,
      notes: "Parsed from JSON upload",
      createdAt: new Date().toISOString()
    }));
}

export async function parseInvoiceFile(file: File): Promise<Invoice[]> {
  const fileName = file.name;
  const extension = fileName.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "csv" || file.type.includes("csv")) {
    const rows = await parseCsvInvoices(buffer, fileName);
    if (rows.length === 0) {
      throw new Error("No invoice rows found in CSV.");
    }
    return rows;
  }

  if (extension === "pdf" || file.type.includes("pdf")) {
    const result = await pdfParse(buffer);
    const invoice = parsePdfTextToInvoice(result.text, fileName);

    if (invoice.amount <= 0) {
      throw new Error(
        "PDF parsing could not find a valid amount. Include a clear 'Total' or 'Amount Due' label."
      );
    }

    return [invoice];
  }

  if (extension === "json" || file.type.includes("json")) {
    const text = buffer.toString("utf8");
    const invoices = parseJsonInvoices(text, fileName);
    if (invoices.length === 0) {
      throw new Error("JSON file did not include any invoice records.");
    }
    return invoices;
  }

  throw new Error("Unsupported invoice format. Upload CSV, JSON, or PDF.");
}
