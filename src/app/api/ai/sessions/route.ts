import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatSessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// GET - list sessions, or get a single session with messages via ?get=id
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const getId = req.nextUrl.searchParams.get("get");
  if (getId) {
    const [chatSession] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, parseInt(getId)));
    if (!chatSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(chatSession);
  }

  const sessions = await db
    .select({ id: chatSessions.id, title: chatSessions.title, status: chatSessions.status, updatedAt: chatSessions.updatedAt })
    .from(chatSessions)
    .orderBy(desc(chatSessions.updatedAt));

  return NextResponse.json(sessions);
}

// POST - create new session
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const [created] = await db.insert(chatSessions).values({
    title: "New Chat",
    messages: [],
  }).returning();

  return NextResponse.json(created);
}

// PATCH - update session (title or messages)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id, title, messages } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (messages !== undefined) updates.messages = messages;

  const [updated] = await db
    .update(chatSessions)
    .set(updates)
    .where(eq(chatSessions.id, id))
    .returning();

  return NextResponse.json(updated);
}

// DELETE - delete a session
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.delete(chatSessions).where(eq(chatSessions.id, id));
  return NextResponse.json({ deleted: true });
}
