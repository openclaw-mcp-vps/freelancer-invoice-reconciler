"use client";

import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Invoice } from "@/lib/types";

interface UploadResult {
  uploaded: number;
  totalInvoices: number;
  invoices: Invoice[];
}

interface InvoiceUploaderProps {
  onUploaded?: (result: UploadResult) => void;
}

export function InvoiceUploader({ onUploaded }: InvoiceUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) {
      setError("Choose a CSV, JSON, or PDF invoice file before uploading.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as UploadResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Invoice upload failed.");
      }

      setResult(data);
      onUploaded?.(data);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Invoice upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileUp className="h-5 w-5 text-blue-400" />
          Invoice Upload
        </CardTitle>
        <CardDescription>
          Upload your invoice export in CSV or JSON, or a single PDF invoice. Parsing is automatic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-dashed border-[#30363d] bg-[#0d1117]/80 p-4">
          <input
            type="file"
            accept=".csv,.json,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full text-sm text-[#8b949e] file:mr-4 file:rounded-md file:border-0 file:bg-[#1f6feb] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500"
          />
        </div>

        <Button onClick={handleUpload} disabled={uploading || !file}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Upload Invoices
        </Button>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {result ? (
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/80 p-4 text-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="success">{result.uploaded} parsed</Badge>
              <Badge variant="outline">{result.totalInvoices} total on account</Badge>
            </div>
            <div className="space-y-2">
              {result.invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#21262d] p-2">
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                  <span className="text-[#8b949e]">{invoice.clientName}</span>
                  <span className="font-medium text-emerald-400">
                    {invoice.currency} {invoice.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
