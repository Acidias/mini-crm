import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@/db";
import { persons } from "@/db/schema";
import { isNotNull, isNull, and } from "drizzle-orm";
import { checkLinkedIn } from "@/lib/linkedin";

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
