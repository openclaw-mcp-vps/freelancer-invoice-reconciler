import { NextResponse, type NextRequest } from "next/server";

const protectedApiPrefixes = [
  "/api/invoices/upload",
  "/api/reconcile",
  "/api/reports",
  "/api/stripe/connect"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessCookie = request.cookies.get("fri_access")?.value;
  const hasAccess = accessCookie === "granted";

  const isProtectedPage = pathname.startsWith("/dashboard");
  const isProtectedApi = protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  if (hasAccess) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json(
      { error: "Purchase required. Complete checkout and unlock access first." },
      { status: 402 }
    );
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.searchParams.set("paywall", "1");

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/invoices/upload/:path*", "/api/reconcile/:path*", "/api/reports/:path*", "/api/stripe/connect/:path*"]
};
