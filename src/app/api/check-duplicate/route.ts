import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { persons, companies } from "@/db/schema";
import { ilike, and, ne } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const email = searchParams.get("email");
  const name = searchParams.get("name");
  const excludeId = searchParams.get("excludeId");

  if (type === "person" && email) {
    const where = excludeId
      ? and(ilike(persons.email, email), ne(persons.id, parseInt(excludeId)))
      : ilike(persons.email, email);
    const matches = await db
      .select({ id: persons.id, name: persons.name, email: persons.email })
      .from(persons)
      .where(where)
      .limit(3);
    return NextResponse.json({ duplicates: matches });
  }

  if (type === "company" && name) {
    const where = excludeId
      ? and(ilike(companies.name, name), ne(companies.id, parseInt(excludeId)))
      : ilike(companies.name, name);
    const matches = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(where)
      .limit(3);
    return NextResponse.json({ duplicates: matches });
  }

  return NextResponse.json({ duplicates: [] });
}
