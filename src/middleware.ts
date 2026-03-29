import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isPublicPath =
    req.nextUrl.pathname.startsWith("/api/webhooks") ||
    req.nextUrl.pathname.startsWith("/api/auth");

  // Allow API routes with API key header to pass through (validated in route handlers)
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/");
  const hasApiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");

  if (isPublicPath || (isApiRoute && hasApiKey)) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
