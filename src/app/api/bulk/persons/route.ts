import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { persons } from "@/db/schema";
import { inArray } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }
  await db.update(persons).set({ deletedAt: new Date() }).where(inArray(persons.id, ids));
  return NextResponse.json({ deleted: ids.length });
}
