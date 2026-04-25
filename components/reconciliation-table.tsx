"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, RefreshCcw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { ReconciliationResult } from "@/lib/types";

interface ReconcileApiPayload {
  result: ReconciliationResult | null;
  invoices?: number;
  payoutsConnected?: boolean;
  error?: string;
}

interface ReconciliationTableProps {
  refreshSignal: number;
}

function statusBadgeVariant(status: string) {
  if (status === "matched") {
    return "success" as const;
  }

  if (status === "amount_mismatch") {
    return "warning" as const;
  }

  return "destructive" as const;
}

function statusLabel(status: string) {
  switch (status) {
    case "matched":
      return "Matched";
    case "amount_mismatch":
      return "Amount Mismatch";
    case "payout_missing":
      return "Missing Payout";
    case "invoice_missing":
      return "Missing Invoice";
    default:
      return status;
  }
}

export function ReconciliationTable({ refreshSignal }: ReconciliationTableProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ReconcileApiPayload>({ result: null });

  async function loadLatest() {
    setInitialLoading(true);
    setError("");

    try {
      const response = await fetch("/api/reconcile", { cache: "no-store" });
      const data = (await response.json()) as ReconcileApiPayload;
      setPayload(data);

      if (!response.ok && data.error) {
        setError(data.error);
      }
    } catch {
      setError("Failed to load reconciliation data.");
    } finally {
      setInitialLoading(false);
    }
  }

  async function runReconciliation() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/reconcile", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      });

      const data = (await response.json()) as {
        result?: ReconciliationResult;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error ?? "Reconciliation failed.");
      }

      setPayload({ result: data.result });
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Reconciliation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    const response = await fetch("/api/reports?format=csv");

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not generate CSV report.");
      return;
    }

    const csvBlob = await response.blob();
    const objectUrl = URL.createObjectURL(csvBlob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "reconciliation-report.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  useEffect(() => {
    loadLatest();
  }, [refreshSignal]);

  const chartData = useMemo(() => {
    const rows = payload.result?.rows ?? [];
    return [
      {
        name: "Matched",
        count: rows.filter((row) => row.status === "matched").length
      },
      {
        name: "Discrepancies",
        count: rows.filter((row) => row.status !== "matched").length
      }
    ];
  }, [payload.result]);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Reconciliation Results</CardTitle>
        <CardDescription>
          Run automated matching to compare uploaded invoices against Stripe payouts and flag issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button onClick={runReconciliation} disabled={loading || initialLoading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Run Reconciliation
          </Button>
          <Button variant="secondary" onClick={downloadCsv} disabled={!payload.result}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          {payload.invoices !== undefined ? (
            <Badge variant="outline">Invoices on file: {payload.invoices}</Badge>
          ) : null}
          {payload.payoutsConnected ? (
            <Badge variant="success">Stripe payouts connected</Badge>
          ) : (
            <Badge variant="warning">Stripe payouts not connected</Badge>
          )}
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {initialLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#8b949e]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading reconciliation data...
          </div>
        ) : null}

        {payload.result ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 p-3">
                <p className="text-xs text-[#8b949e]">Invoices</p>
                <p className="text-xl font-semibold">{payload.result.summary.totalInvoices}</p>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 p-3">
                <p className="text-xs text-[#8b949e]">Payouts</p>
                <p className="text-xl font-semibold">{payload.result.summary.totalPayouts}</p>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 p-3">
                <p className="text-xs text-[#8b949e]">Matched</p>
                <p className="text-xl font-semibold text-emerald-400">
                  {payload.result.summary.matchedCount}
                </p>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 p-3">
                <p className="text-xs text-[#8b949e]">Discrepancies</p>
                <p className="text-xl font-semibold text-rose-400">
                  {payload.result.summary.discrepancyCount}
                </p>
              </div>
            </div>

            <div className="h-56 rounded-lg border border-[#30363d] bg-[#0d1117]/80 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#8b949e", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(31, 111, 235, 0.12)" }}
                    contentStyle={{
                      background: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: 8
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#1f6feb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.result.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[10rem] space-y-0.5">
                          <p className="font-medium">{row.invoiceNumber ?? "-"}</p>
                          <p className="text-xs text-[#8b949e]">{row.invoiceAmount?.toFixed(2) ?? "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[10rem] space-y-0.5">
                          <p className="font-medium">{row.payoutId ?? "-"}</p>
                          <p className="text-xs text-[#8b949e]">{row.payoutAmount?.toFixed(2) ?? "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell
                        className={
                          row.difference === 0 ? "text-emerald-400" : row.difference > 0 ? "text-amber-400" : "text-rose-400"
                        }
                      >
                        {row.difference.toFixed(2)}
                      </TableCell>
                      <TableCell>{row.confidence.toFixed(1)}%</TableCell>
                      <TableCell className="max-w-[18rem] text-[#8b949e]">{row.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          !initialLoading && (
            <div className="rounded-lg border border-dashed border-[#30363d] p-5 text-sm text-[#8b949e]">
              Run your first reconciliation after uploading invoices and connecting Stripe.
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
