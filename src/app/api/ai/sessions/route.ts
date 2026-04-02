import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@/db";
import { chatSessions } from "@/db/schema";
import { and, desc, eq, lt } from "drizzle-orm";

const STALE_WORKING_MINUTES = 5;

// Reset sessions stuck as "working" for too long (e.g. serverless function killed mid-stream)
async function resetStaleSessions() {
  const cutoff = new Date(Date.now() - STALE_WORKING_MINUTES * 60 * 1000);
  await db
    .update(chatSessions)
    .set({ status: "idle", updatedAt: new Date() })
    .where(and(eq(chatSessions.status, "working"), lt(chatSessions.updatedAt, cutoff)));
}

// GET - list sessions, or get a single session with messages via ?get=id
export async function GET(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const getId = req.nextUrl.searchParams.get("get");
  if (getId) {
    const [chatSession] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, parseInt(getId)));
    if (!chatSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(chatSession);
  }

  // Clean up stale "working" sessions before listing
  await resetStaleSessions();

  const sessions = await db
    .select({ id: chatSessions.id, title: chatSessions.title, status: chatSessions.status, lastMessageAt: chatSessions.lastMessageAt, updatedAt: chatSessions.updatedAt })
    .from(chatSessions)
    .orderBy(desc(chatSessions.lastMessageAt));

  return NextResponse.json(sessions);
}

// POST - create new session
export async function POST(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const [created] = await db.insert(chatSessions).values({
    title: "New Chat",
    messages: [],
  }).returning();

  return NextResponse.json(created);
}

// PATCH - update session (title or messages)
export async function PATCH(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

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
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.delete(chatSessions).where(eq(chatSessions.id, id));
  return NextResponse.json({ deleted: true });
}
