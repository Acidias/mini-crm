import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { validateApiKey } from "@/actions/api-keys";

/**
 * Authenticate an API request via either session (Google OAuth) or API key.
 * Returns true if authenticated, false otherwise.
 */
export async function authenticateRequest(req: NextRequest): Promise<boolean> {
  // Check API key first (from header)
  const apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (apiKey && apiKey.startsWith("mcrm_")) {
    return validateApiKey(apiKey);
  }

  // Fall back to session auth
  const session = await auth();
  return !!session?.user;
}
