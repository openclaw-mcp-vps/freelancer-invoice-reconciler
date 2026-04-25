import { NextResponse } from "next/server";
import {
  createId,
  ensureUser,
  readDatabase,
  setStripeAccount,
  setUserEmail,
  writeDatabase
} from "@/lib/database";
import {
  createConnectOnboardingLink,
  getConnectAccountSummary
} from "@/lib/stripe";

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

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const userId = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("fri_user="))
    ?.split("=")[1];

  if (!userId) {
    return NextResponse.json({ connected: false });
  }

  const state = await readDatabase();
  const user = state.users.find((item) => item.id === userId);

  if (!user?.stripeAccountId) {
    return NextResponse.json({ connected: false });
  }

  try {
    const account = await getConnectAccountSummary(user.stripeAccountId);

    return NextResponse.json({
      connected: account.detailsSubmitted,
      account
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error:
          error instanceof Error
            ? error.message
            : "Stripe account lookup failed."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    refreshUrl?: string;
    returnUrl?: string;
  };

  const state = await readDatabase();
  const userCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("fri_user="))
    ?.split("=")[1];

  const userId = userCookie ?? createId("user");
  const user = ensureUser(state, userId);

  if (body.email?.trim()) {
    setUserEmail(state, userId, body.email);
  }

  const origin = getRequestOrigin(request);

  try {
    const onboarding = await createConnectOnboardingLink({
      existingAccountId: user.stripeAccountId,
      refreshUrl: body.refreshUrl ?? `${origin}/dashboard?connect=refresh`,
      returnUrl: body.returnUrl ?? `${origin}/dashboard?connect=success`
    });

    setStripeAccount(state, userId, onboarding.accountId);
    await writeDatabase(state);

    const response = NextResponse.json({
      onboardingUrl: onboarding.onboardingUrl,
      accountId: onboarding.accountId,
      expiresAt: onboarding.expiresAt
    });

    response.cookies.set("fri_user", userId, cookieOptions());

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Stripe onboarding link."
      },
      { status: 500 }
    );
  }
}
