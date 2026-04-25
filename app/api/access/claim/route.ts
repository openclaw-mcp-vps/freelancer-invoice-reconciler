import { NextResponse } from "next/server";
import {
  createId,
  ensureUser,
  findUserByEmail,
  hasPurchaseForEmail,
  readDatabase,
  setUserEmail,
  writeDatabase
} from "@/lib/database";

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  };
}

function redirectWithQuery(request: Request, query: string) {
  const url = new URL(request.url);
  url.pathname = "/";
  url.search = query;
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let email = "";

  if (isJson) {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim() ?? "";
  } else {
    const formData = await request.formData();
    email = String(formData.get("email") ?? "").trim();
  }

  if (!email) {
    if (!isJson) {
      return redirectWithQuery(request, "unlock=missing_email");
    }

    return NextResponse.json({ error: "Purchase email is required." }, { status: 400 });
  }

  const state = await readDatabase();

  if (!hasPurchaseForEmail(state, email)) {
    if (!isJson) {
      return redirectWithQuery(request, "unlock=no_purchase");
    }

    return NextResponse.json(
      {
        error:
          "No purchase was found for that email yet. Complete checkout first, then try again after Stripe webhook delivery."
      },
      { status: 403 }
    );
  }

  const existingUser = findUserByEmail(state, email);
  const userId = existingUser?.id ?? createId("user");

  ensureUser(state, userId);
  setUserEmail(state, userId, email);

  await writeDatabase(state);

  const response = isJson
    ? NextResponse.json({ ok: true, message: "Access unlocked." })
    : NextResponse.redirect(new URL("/dashboard", request.url));

  response.cookies.set("fri_access", "granted", baseCookieOptions());
  response.cookies.set("fri_user", userId, baseCookieOptions());

  return response;
}
