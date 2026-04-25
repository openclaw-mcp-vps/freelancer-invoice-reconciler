import { NextResponse } from "next/server";
import { listInvoices, listReconciliations, readDatabase } from "@/lib/database";
import { buildCsvReport, buildTaxReport } from "@/lib/report-generator";

export const runtime = "nodejs";

function readCookie(request: Request, key: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const found = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));

  return found?.split("=")[1];
}

export async function GET(request: Request) {
  const userId = readCookie(request, "fri_user");

  if (!userId) {
    return NextResponse.json({ error: "Missing user session." }, { status: 400 });
  }

  const state = await readDatabase();
  const latestResult = listReconciliations(state, userId)[0];

  if (!latestResult) {
    return NextResponse.json(
      { error: "No reconciliation result available yet. Run reconciliation first." },
      { status: 404 }
    );
  }

  const format = new URL(request.url).searchParams.get("format") ?? "json";

  if (format === "csv") {
    const csv = buildCsvReport(latestResult);

    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=invoice-reconciliation-report.csv"
      }
    });
  }

  const invoices = listInvoices(state, userId);
  const report = buildTaxReport(latestResult, invoices);

  return NextResponse.json(report);
}
