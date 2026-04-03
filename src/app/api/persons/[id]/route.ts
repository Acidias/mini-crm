import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@/db";
import { persons, companies, emails, todos, activities, tags, entityTags, personGroups, groups } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const personId = parseInt(id);

  const [person] = await db.select().from(persons).where(eq(persons.id, personId));
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Company
  let company = null;
  if (person.companyId) {
    const [c] = await db.select().from(companies).where(eq(companies.id, person.companyId));
    company = c || null;
  }

  // Emails
  const personEmails = await db
    .select({ id: emails.id, subject: emails.subject, direction: emails.direction, createdAt: emails.createdAt, fromAddress: emails.fromAddress, toAddress: emails.toAddress })
    .from(emails)
    .where(eq(emails.personId, personId))
    .orderBy(desc(emails.createdAt))
    .limit(10);

  // Todos
  const personTodos = await db
    .select({ id: todos.id, title: todos.title, dueDate: todos.dueDate, done: todos.done })
    .from(todos)
    .where(eq(todos.personId, personId))
    .orderBy(desc(todos.createdAt))
    .limit(10);

  // Activities
  const personActivities = await db
    .select({ id: activities.id, type: activities.type, title: activities.title, notes: activities.notes, createdAt: activities.createdAt })
    .from(activities)
    .where(eq(activities.personId, personId))
    .orderBy(desc(activities.createdAt))
    .limit(10);

  // Tags
  const personTags = await db
    .select({ entityTagId: entityTags.id, tagId: tags.id, name: tags.name, colour: tags.colour })
    .from(entityTags)
    .innerJoin(tags, eq(entityTags.tagId, tags.id))
    .where(eq(entityTags.personId, personId));

  // Groups
  const personGroupsList = await db
    .select({ groupId: groups.id, name: groups.name, colour: groups.colour })
    .from(personGroups)
    .innerJoin(groups, eq(personGroups.groupId, groups.id))
    .where(eq(personGroups.personId, personId));

  return NextResponse.json({
    person,
    company,
    emails: personEmails,
    todos: personTodos,
    activities: personActivities,
    tags: personTags,
    groups: personGroupsList,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const personId = parseInt(id);
  const formData = await req.formData();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const name = formData.get("name") as string;
  if (name) updates.name = name.trim();
  const email = formData.get("email") as string;
  if (email !== null) updates.email = email.trim() || null;
  const phone = formData.get("phone") as string;
  if (phone !== null) updates.phone = phone.trim() || null;
  const position = formData.get("position") as string;
  if (position !== null) updates.position = position.trim() || null;
  const linkedin = formData.get("linkedin") as string;
  if (linkedin !== null) updates.linkedin = linkedin.trim() || null;
  const notes = formData.get("notes") as string;
  if (notes !== null) updates.notes = notes.trim() || null;

  const [updated] = await db.update(persons).set(updates).where(eq(persons.id, personId)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const personId = parseInt(id);

  const [updated] = await db.update(persons)
    .set({ lastContactedAt: new Date(), updatedAt: new Date() })
    .where(eq(persons.id, personId))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
