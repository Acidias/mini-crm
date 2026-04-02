import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@/db";
import { persons } from "@/db/schema";
import { eq, isNotNull, isNull, and } from "drizzle-orm";

async function checkLinkedIn(url: string): Promise<{ valid: boolean; status: number; redirected?: string }> {
  try {
    // Normalise URL
    let normalised = url.trim();
    if (!normalised.startsWith("http")) normalised = `https://${normalised}`;
    if (!normalised.includes("linkedin.com")) {
      return { valid: false, status: 0 };
    }

    const res = await fetch(normalised, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MiniCRM/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    // LinkedIn returns 200 for valid profiles, 404 for invalid
    // Sometimes redirects to login page (999 or 302) - treat as uncertain
    const finalUrl = res.url;
    const isLoginRedirect = finalUrl.includes("/login") || finalUrl.includes("/authwall");

    if (res.status === 200 && !isLoginRedirect) {
      return { valid: true, status: res.status };
    }
    if (res.status === 404 || res.status === 410) {
      return { valid: false, status: res.status };
    }
    // 999 = LinkedIn rate limit/block, 302 = auth redirect - inconclusive
    return { valid: true, status: res.status, redirected: isLoginRedirect ? "login" : undefined };
  } catch {
    return { valid: false, status: 0 };
  }
}

// GET - verify a single URL
export async function GET(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const result = await checkLinkedIn(url);
  return NextResponse.json(result);
}

// POST - bulk verify all persons with LinkedIn URLs
export async function POST(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const allWithLinkedIn = await db
    .select({ id: persons.id, name: persons.name, linkedin: persons.linkedin })
    .from(persons)
    .where(and(isNotNull(persons.linkedin), isNull(persons.deletedAt)));

  const results: { id: number; name: string; linkedin: string; valid: boolean; status: number }[] = [];

  for (const p of allWithLinkedIn) {
    if (!p.linkedin) continue;
    const check = await checkLinkedIn(p.linkedin);
    results.push({
      id: p.id,
      name: p.name,
      linkedin: p.linkedin,
      valid: check.valid,
      status: check.status,
    });
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({
    total: results.length,
    valid: results.filter((r) => r.valid).length,
    invalid: results.filter((r) => !r.valid),
  });
}
