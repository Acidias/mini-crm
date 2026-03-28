export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Protect everything except login, api/webhooks, static files
    "/((?!login|api/webhooks|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
