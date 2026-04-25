import { NextResponse } from "next/server";
import {
  appendInvoices,
  createId,
  ensureUser,
  listInvoices,
  readDatabase,
  writeDatabase
} from "@/lib/database";
import { parseInvoiceFile } from "@/lib/invoice-parser";

export const runtime = "nodejs";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  };
}

function readCookie(request: Request, key: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const found = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));

  return found?.split("=")[1];
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Upload a CSV, JSON, or PDF invoice file." }, { status: 400 });
    }

    const parsedInvoices = await parseInvoiceFile(file);

    const state = await readDatabase();
    const userId = readCookie(request, "fri_user") ?? createId("user");
    ensureUser(state, userId);
    appendInvoices(state, userId, parsedInvoices);
    await writeDatabase(state);

    const allInvoices = listInvoices(state, userId);

    const response = NextResponse.json({
      uploaded: parsedInvoices.length,
      totalInvoices: allInvoices.length,
      invoices: parsedInvoices
    });

    response.cookies.set("fri_user", userId, cookieOptions());

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invoice upload failed."
      },
      { status: 400 }
    );
  }
}
