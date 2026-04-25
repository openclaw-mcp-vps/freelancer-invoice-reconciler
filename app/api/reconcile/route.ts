import { NextResponse } from "next/server";
import {
  appendReconciliation,
  listInvoices,
  listReconciliations,
  readDatabase,
  setUserEmail,
  writeDatabase
} from "@/lib/database";
import { reconcileInvoicesToPayouts } from "@/lib/reconciliation-engine";
import { listStripePayouts } from "@/lib/stripe";
import type { Payout } from "@/lib/types";

export const runtime = "nodejs";

function readCookie(request: Request, key: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const found = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));

  return found?.split("=")[1];
}

function parseManualPayouts(raw: unknown): Payout[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && !!item)
    .map((item, index) => ({
      id: String(item.id ?? `manual_${index}`),
      amount: Number(item.amount ?? 0),
      currency: String(item.currency ?? "USD").toUpperCase(),
      arrivalDate: new Date(String(item.arrivalDate ?? new Date().toISOString())).toISOString(),
      status: String(item.status ?? "paid"),
      description: item.description ? String(item.description) : undefined
    }))
    .filter((item) => Number.isFinite(item.amount));
}

export async function GET(request: Request) {
  const userId = readCookie(request, "fri_user");

  if (!userId) {
    return NextResponse.json({ result: null, invoices: 0, payoutsConnected: false });
  }

  const state = await readDatabase();
  const history = listReconciliations(state, userId);
  const user = state.users.find((item) => item.id === userId);

  return NextResponse.json({
    result: history[0] ?? null,
    invoices: listInvoices(state, userId).length,
    payoutsConnected: Boolean(user?.stripeAccountId)
  });
}

export async function POST(request: Request) {
  const userId = readCookie(request, "fri_user");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing user session. Unlock access and reload dashboard." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    payouts?: unknown;
  };

  const state = await readDatabase();
  const user = state.users.find((item) => item.id === userId);

  if (body.email?.trim()) {
    setUserEmail(state, userId, body.email);
  }

  const invoices = listInvoices(state, userId);

  if (invoices.length === 0) {
    return NextResponse.json(
      { error: "Upload invoices first. Reconciliation needs at least one invoice." },
      { status: 400 }
    );
  }

  let payouts: Payout[] = parseManualPayouts(body.payouts);

  if (payouts.length === 0 && user?.stripeAccountId) {
    try {
      payouts = await listStripePayouts(user.stripeAccountId);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Stripe payout fetch failed: ${error.message}`
              : "Stripe payout fetch failed."
        },
        { status: 500 }
      );
    }
  }

  const result = reconcileInvoicesToPayouts(invoices, payouts);

  appendReconciliation(state, userId, result);
  await writeDatabase(state);

  return NextResponse.json({
    result,
    invoiceCount: invoices.length,
    payoutCount: payouts.length,
    usedStripePayouts: payouts.length > 0 && Boolean(user?.stripeAccountId)
  });
}
