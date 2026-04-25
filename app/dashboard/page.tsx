import type { Metadata } from "next";
import { FileCheck2, ReceiptText, ShieldCheck } from "lucide-react";
import { StripeConnectButton } from "@/components/stripe-connect-button";
import { DashboardWorkspace } from "@/components/dashboard-workspace";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Upload invoices, connect Stripe payouts, run reconciliation, and export tax-ready discrepancy reports."
};

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8 grid gap-6 rounded-2xl border border-[#30363d] bg-[#161b22]/90 p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <p className="inline-flex items-center rounded-full border border-[#30363d] bg-[#0d1117]/70 px-3 py-1 text-xs uppercase tracking-wide text-[#8b949e]">
            Freelancer Invoice Reconciler
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Auto-reconcile Stripe payouts with invoices
          </h1>
          <p className="max-w-2xl text-sm text-[#8b949e] sm:text-base">
            Replace manual spreadsheet matching with a repeatable reconciliation workflow. Upload invoices,
            sync Stripe payouts, flag discrepancies, and export records you can hand directly to your tax
            preparer.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 p-3">
              <ReceiptText className="mb-2 h-4 w-4 text-blue-400" />
              <p className="text-sm font-medium">Invoice Parsing</p>
              <p className="text-xs text-[#8b949e]">CSV, JSON, and PDF upload support.</p>
            </div>
            <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 p-3">
              <FileCheck2 className="mb-2 h-4 w-4 text-emerald-400" />
              <p className="text-sm font-medium">Match Confidence</p>
              <p className="text-xs text-[#8b949e]">Algorithmic score for every match row.</p>
            </div>
            <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 p-3">
              <ShieldCheck className="mb-2 h-4 w-4 text-cyan-400" />
              <p className="text-sm font-medium">Tax-Ready Exports</p>
              <p className="text-xs text-[#8b949e]">Download reconciliation CSV in one click.</p>
            </div>
          </div>
        </div>
        <StripeConnectButton />
      </section>

      <DashboardWorkspace />
    </main>
  );
}
