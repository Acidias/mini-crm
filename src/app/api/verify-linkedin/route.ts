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

    // Basic URL format validation - must be /in/username pattern
    const pathMatch = normalised.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    if (!pathMatch) {
      return { valid: false, status: 0 };
    }

    const res = await fetch(normalised, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 404 || res.status === 410) {
      return { valid: false, status: res.status };
    }

    // Always read the body - LinkedIn returns 200 for both valid profiles,
    // soft-404 pages, and auth walls. We need to check the content.
    const body = await res.text();

    // Soft-404 indicators (page doesn't exist)
    const isSoft404 =
      body.includes("Page not found") ||
      body.includes("page-not-found") ||
      body.includes("profile-unavailable") ||
      body.includes("This page doesn\u2019t exist") ||
      body.includes("This page doesn't exist") ||
      body.includes('"statusCode":404');
    if (isSoft404) return { valid: false, status: res.status };

    // Real profiles have og:title with the person's name or profile-specific metadata
    const hasProfileMeta =
      body.includes('og:type" content="profile"') ||
      body.includes("pv-top-card") ||
      body.includes("profile-section") ||
      body.includes('"@type":"Person"');
    if (hasProfileMeta) return { valid: true, status: res.status };

    // Auth wall / login redirect - no profile metadata visible.
    // Check if the auth wall page contains any reference to the profile slug
    // (LinkedIn embeds the target profile name even on the auth wall)
    const slug = pathMatch[1].toLowerCase();
    const bodyLower = body.toLowerCase();
    const hasSlugReference = bodyLower.includes(slug.replace(/-/g, " ")) ||
      bodyLower.includes(`/in/${slug}`);
    if (hasSlugReference) return { valid: true, status: res.status };

    // No profile indicators found - likely invalid
    return { valid: false, status: res.status, redirected: "login" };
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
