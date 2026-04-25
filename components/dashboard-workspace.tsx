"use client";

import { useState } from "react";
import { InvoiceUploader } from "@/components/invoice-uploader";
import { ReconciliationTable } from "@/components/reconciliation-table";

export function DashboardWorkspace() {
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className="space-y-6">
      <InvoiceUploader onUploaded={() => setRefreshSignal((value) => value + 1)} />
      <ReconciliationTable refreshSignal={refreshSignal} />
    </div>
  );
}
