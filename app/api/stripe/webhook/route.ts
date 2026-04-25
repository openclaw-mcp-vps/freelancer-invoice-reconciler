import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { addPurchase, createId, readDatabase, writeDatabase } from "@/lib/database";
import { buildWebhookEvent } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature header." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = buildWebhookEvent(payload, signature);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook signature verification failed."
      },
      { status: 400 }
    );
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email ?? session.customer_email;

    if (email) {
      const state = await readDatabase();

      addPurchase(state, {
        id: createId("purchase"),
        email: email.toLowerCase().trim(),
        amountTotal: Number(((session.amount_total ?? 0) / 100).toFixed(2)),
        currency: String(session.currency ?? "usd").toUpperCase(),
        stripeSessionId: session.id,
        purchasedAt: new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString()
      });

      await writeDatabase(state);
    }
  }

  return NextResponse.json({ received: true });
}
