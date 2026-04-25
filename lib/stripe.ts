import Stripe from "stripe";
import type { Payout } from "@/lib/types";

let stripeClient: Stripe | null = null;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing`);
  }
  return value;
}

export function getStripe() {
  if (stripeClient) {
    return stripeClient;
  }

  stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-08-27.basil"
  });

  return stripeClient;
}

export function getPaymentLink() {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";
}

export function getPublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
}

export function buildWebhookEvent(payload: string, signature: string) {
  const stripe = getStripe();
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function createConnectOnboardingLink(params: {
  existingAccountId?: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  const stripe = getStripe();

  const accountId =
    params.existingAccountId ??
    (
      await stripe.accounts.create({
        type: "express",
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        }
      })
    ).id;

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding"
  });

  return {
    accountId,
    onboardingUrl: link.url,
    expiresAt: link.expires_at
  };
}

export async function getConnectAccountSummary(accountId: string) {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);

  return {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted
  };
}

export async function listStripePayouts(accountId: string): Promise<Payout[]> {
  const stripe = getStripe();

  const payoutList = await stripe.payouts.list(
    {
      limit: 100
    },
    {
      stripeAccount: accountId
    }
  );

  return payoutList.data.map((payout) => ({
    id: payout.id,
    amount: payout.amount / 100,
    currency: payout.currency.toUpperCase(),
    arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
    status: payout.status,
    description: payout.description ?? undefined
  }));
}
