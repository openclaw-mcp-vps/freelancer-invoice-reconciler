import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Banknote, BadgeCheck, FileSpreadsheet, ShieldAlert, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Auto-reconcile Stripe payouts with invoices",
  description:
    "Freelancer Invoice Reconciler matches Stripe payouts to invoices, flags discrepancies, and generates tax-ready reports for freelancers earning $50K+ annually.",
  openGraph: {
    title: "Freelancer Invoice Reconciler",
    description:
      "Automated Stripe payout and invoice reconciliation for fintech-focused freelancers.",
    url: "/"
  }
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function AlertBanner({ paywall, unlock }: { paywall: string | undefined; unlock: string | undefined }) {
  if (!paywall && !unlock) {
    return null;
  }

  const message =
    unlock === "missing_email"
      ? "Enter the same email you used at checkout to unlock access."
      : unlock === "no_purchase"
        ? "Purchase not found for that email yet. Complete checkout first, then retry after webhook delivery."
        : paywall
          ? "The dashboard is behind the paid plan. Purchase and unlock access to continue."
          : null;

  if (!message) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      {message}
    </div>
  );
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const paywall = typeof params.paywall === "string" ? params.paywall : undefined;
  const unlock = typeof params.unlock === "string" ? params.unlock : undefined;
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-[-10rem] top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-12rem] top-64 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-16 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-emerald-500" />
            <span className="text-sm font-semibold tracking-wide">Freelancer Invoice Reconciler</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <a href="#pricing" className="text-[#8b949e] transition hover:text-[#e6edf3]">
              Pricing
            </a>
            <a href="#faq" className="text-[#8b949e] transition hover:text-[#e6edf3]">
              FAQ
            </a>
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                Dashboard
              </Button>
            </Link>
          </nav>
        </header>

        <AlertBanner paywall={paywall} unlock={unlock} />

        <section className="mb-20 grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1 text-xs uppercase tracking-wider text-[#8b949e]">
              Built for fintech freelancers earning $50K+
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Stop reconciling Stripe payouts by hand.
            </h1>
            <p className="max-w-xl text-base text-[#8b949e] sm:text-lg">
              Match payouts to invoices in minutes, catch missing or mismatched payments before tax season,
              and hand your accountant clean, tax-ready exports every month.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={paymentLink} className="inline-flex">
                <Button size="lg" className="gap-2">
                  Start for $19/month
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link href="/dashboard" className="inline-flex">
                <Button variant="outline" size="lg">
                  View Paid Dashboard
                </Button>
              </Link>
            </div>
            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#30363d] bg-[#161b22]/80 p-3">
                <p className="text-xs text-[#8b949e]">Setup Time</p>
                <p className="text-lg font-semibold">Under 10 min</p>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#161b22]/80 p-3">
                <p className="text-xs text-[#8b949e]">Typical Savings</p>
                <p className="text-lg font-semibold">4-6 hrs/mo</p>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#161b22]/80 p-3">
                <p className="text-xs text-[#8b949e]">Ideal Revenue</p>
                <p className="text-lg font-semibold">$50K+ / year</p>
              </div>
            </div>
          </div>

          <Card className="border-[#385880] bg-gradient-to-b from-[#111b2b] to-[#111827]">
            <CardHeader>
              <CardTitle>Unlock Your Account After Purchase</CardTitle>
              <CardDescription>
                Complete Stripe checkout, then submit the checkout email to enable dashboard access on this
                browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form method="POST" action="/api/access/claim" className="space-y-3">
                <label htmlFor="email" className="block text-sm text-[#8b949e]">
                  Purchase email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@business.com"
                  className="h-11 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 text-sm text-[#e6edf3] placeholder:text-[#8b949e] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" className="w-full">
                  Unlock Dashboard
                </Button>
                <p className="text-xs text-[#8b949e]">
                  If webhook delivery is delayed, wait a minute and retry unlock.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="mb-20" id="problem">
          <div className="mb-6 flex items-center gap-2 text-sm text-rose-300">
            <ShieldAlert className="h-4 w-4" />
            The costly manual process
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Ambiguity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  Stripe payouts bundle multiple charges and fees, so freelancers struggle to map payouts back
                  to invoice-level records.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tax Season Panic</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  Missing one payout or invoice can distort quarterly estimates, increase audit risk, and slow
                  down tax filing prep.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spreadsheet Fatigue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  Manual matching drains billable time every month and creates error-prone reconciliation
                  habits.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-20" id="solution">
          <div className="mb-6 flex items-center gap-2 text-sm text-emerald-300">
            <BadgeCheck className="h-4 w-4" />
            What you get
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-400" />
                  Stripe Connect Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  Securely connect Stripe once and pull payout data automatically for each reconciliation run.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  Smart Invoice Matching
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  Upload invoice files, match by amount/date proximity, and flag amount mismatches or missing
                  records instantly.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Banknote className="h-5 w-5 text-cyan-400" />
                  Tax-Ready Reporting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  Export a clean reconciliation CSV you can share with your CPA for faster tax prep.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="pricing" className="mb-20">
          <Card className="mx-auto max-w-xl border-blue-500/40 bg-gradient-to-b from-[#0f1a2d] to-[#111827]">
            <CardHeader>
              <CardTitle className="text-2xl">Simple pricing for solo freelancers</CardTitle>
              <CardDescription>
                One plan focused on monthly reconciliation and year-end tax readiness.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold">$19</span>
                <span className="pb-1 text-sm text-[#8b949e]">/ month</span>
              </div>
              <ul className="space-y-2 text-sm text-[#8b949e]">
                <li>Unlimited invoice uploads (CSV, JSON, PDF)</li>
                <li>Stripe payout matching with discrepancy flags</li>
                <li>CSV report exports for tax prep</li>
                <li>Priority email support for reconciliation issues</li>
              </ul>
              <a href={paymentLink} className="inline-flex w-full">
                <Button className="w-full" size="lg">
                  Buy Now with Stripe Checkout
                </Button>
              </a>
            </CardContent>
          </Card>
        </section>

        <section id="faq" className="mb-16">
          <h2 className="mb-6 text-2xl font-semibold">FAQ</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Do you store my Stripe credentials?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  No. Stripe Connect handles authorization. This app receives account tokens needed to read
                  payouts only.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What invoice formats are supported?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  CSV and JSON are best for bulk imports. Single PDF invoices are supported for one-off
                  reconciliation.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How does paywall access work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  After Stripe checkout, submit your purchase email once. The app sets an access cookie and
                  unlocks the dashboard on this browser.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Is this enough for tax filing?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">
                  It is designed to speed up reconciliation and generate accountant-ready exports. Final filing
                  decisions should still be reviewed by a qualified tax professional.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
