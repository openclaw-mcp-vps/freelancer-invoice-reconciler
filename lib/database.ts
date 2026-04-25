import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  DatabaseState,
  Invoice,
  PurchaseRecord,
  ReconciliationResult,
  UserRecord
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const EMPTY_STATE: DatabaseState = {
  users: [],
  invoicesByUser: {},
  reconciliationsByUser: {},
  purchases: []
};

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(EMPTY_STATE, null, 2), "utf8");
  }
}

export async function readDatabase(): Promise<DatabaseState> {
  await ensureDataFile();

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as DatabaseState;

    return {
      users: parsed.users ?? [],
      invoicesByUser: parsed.invoicesByUser ?? {},
      reconciliationsByUser: parsed.reconciliationsByUser ?? {},
      purchases: parsed.purchases ?? []
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function writeDatabase(state: DatabaseState) {
  await ensureDataFile();
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export function ensureUser(state: DatabaseState, userId: string): UserRecord {
  const existing = state.users.find((user) => user.id === userId);

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const user: UserRecord = {
    id: userId,
    createdAt: now,
    updatedAt: now
  };

  state.users.push(user);
  state.invoicesByUser[user.id] = state.invoicesByUser[user.id] ?? [];
  state.reconciliationsByUser[user.id] = state.reconciliationsByUser[user.id] ?? [];

  return user;
}

export function setUserEmail(state: DatabaseState, userId: string, email: string) {
  const user = ensureUser(state, userId);
  user.email = email.toLowerCase().trim();
  user.updatedAt = new Date().toISOString();
}

export function setStripeAccount(state: DatabaseState, userId: string, accountId: string) {
  const user = ensureUser(state, userId);
  user.stripeAccountId = accountId;
  user.updatedAt = new Date().toISOString();
}

export function findUserByEmail(state: DatabaseState, email: string): UserRecord | undefined {
  const normalized = email.toLowerCase().trim();
  return state.users.find((user) => user.email?.toLowerCase() === normalized);
}

export function appendInvoices(state: DatabaseState, userId: string, invoices: Invoice[]) {
  ensureUser(state, userId);
  const existing = state.invoicesByUser[userId] ?? [];
  state.invoicesByUser[userId] = [...existing, ...invoices];
}

export function listInvoices(state: DatabaseState, userId: string): Invoice[] {
  ensureUser(state, userId);
  return state.invoicesByUser[userId] ?? [];
}

export function appendReconciliation(
  state: DatabaseState,
  userId: string,
  result: ReconciliationResult
) {
  ensureUser(state, userId);
  const existing = state.reconciliationsByUser[userId] ?? [];
  state.reconciliationsByUser[userId] = [result, ...existing].slice(0, 50);
}

export function listReconciliations(state: DatabaseState, userId: string): ReconciliationResult[] {
  ensureUser(state, userId);
  return state.reconciliationsByUser[userId] ?? [];
}

export function addPurchase(state: DatabaseState, purchase: PurchaseRecord) {
  const exists = state.purchases.some(
    (item) => item.stripeSessionId === purchase.stripeSessionId
  );

  if (!exists) {
    state.purchases.unshift(purchase);
  }
}

export function hasPurchaseForEmail(state: DatabaseState, email: string) {
  const normalized = email.toLowerCase().trim();
  return state.purchases.some(
    (purchase) => purchase.email.toLowerCase().trim() === normalized
  );
}
