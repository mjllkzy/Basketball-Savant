import { NextResponse, type NextRequest } from "next/server";
import { legacyHostRedirectUrl } from "@/lib/canonicalHost";

export function middleware(request: NextRequest) {
  const redirectUrl = legacyHostRedirectUrl({
    requestUrl: request.nextUrl,
    method: request.method,
    hostHeader: request.headers.get("host")
  });

  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*"
};
