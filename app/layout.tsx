import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://freelancer-invoice-reconciler.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Freelancer Invoice Reconciler | Auto-reconcile Stripe payouts with invoices",
    template: "%s | Freelancer Invoice Reconciler"
  },
  description:
    "Stop manual bookkeeping. Match Stripe payouts to invoices, flag discrepancies, and generate tax-ready reports in minutes.",
  keywords: [
    "stripe payout reconciliation",
    "freelancer bookkeeping",
    "invoice matching",
    "tax prep for freelancers",
    "financial reconciliation software"
  ],
  openGraph: {
    type: "website",
    title: "Freelancer Invoice Reconciler",
    description:
      "Automate Stripe payout reconciliation, catch missing invoices fast, and export tax-ready reports.",
    url: siteUrl,
    siteName: "Freelancer Invoice Reconciler"
  },
  twitter: {
    card: "summary_large_image",
    title: "Freelancer Invoice Reconciler",
    description:
      "Automate Stripe payout reconciliation and tax reporting for your freelance business."
  },
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
