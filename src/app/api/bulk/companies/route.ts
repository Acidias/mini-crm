import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { inArray } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }
  await db.update(companies).set({ deletedAt: new Date() }).where(inArray(companies.id, ids));
  return NextResponse.json({ deleted: ids.length });
}
