import { db } from "@/db";
import {
  persons, companies, events, emails, todos, activities, tags, entityTags,
} from "@/db/schema";
import { eq, ilike, or, and, isNull, desc, asc, gte, lt, count, sql } from "drizzle-orm";
import { sendSmtpEmail, FROM_ADDRESS } from "@/lib/email";
import { getSetting } from "@/actions/settings";
import * as cheerio from "cheerio";
import { checkLinkedIn } from "@/lib/linkedin";

type ToolResult = { success: boolean; data?: unknown; error?: string };
type Input = Record<string, unknown>;

function safeLimit(input: Input, defaultVal = 20): number {
  const v = typeof input.limit === "number" ? input.limit : defaultVal;
  return Math.min(Math.max(v, 1), 50);
}

// ─── Web helpers ───

async function fetchWebPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MiniCRM/1.0)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove scripts, styles, nav, footer, etc.
  $("script, style, nav, footer, header, iframe, noscript, svg").remove();

  // Extract text from body
  const text = $("body").text()
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  // Truncate to avoid overwhelming Claude's context
  return text.length > 15000 ? text.slice(0, 15000) + "\n\n[Content truncated at 15000 chars]" : text;
}

async function searchSerper(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY not configured");

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 10 }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
  const data = await res.json();

  const results: { title: string; url: string; snippet: string }[] = [];

  // Organic results
  if (data.organic) {
    for (const item of data.organic) {
      results.push({
        title: item.title || "",
        url: item.link || "",
        snippet: item.snippet || "",
      });
    }
  }

  return results.slice(0, 10);
}

// ─── Tool Executor Map ───

const executors: Record<string, (input: Input) => Promise<ToolResult>> = {
  // ─── WEB ───
  async web_fetch(input) {
    const url = input.url as string;
    if (!url) return { success: false, error: "URL is required" };
    try {
      const text = await fetchWebPage(url);
      return { success: true, data: { url, content: text, length: text.length } };
    } catch (err) {
      return { success: false, error: `Failed to fetch ${url}: ${err instanceof Error ? err.message : "Unknown error"}` };
    }
  },

  async web_search(input) {
    const query = input.query as string;
    if (!query) return { success: false, error: "Query is required" };
    try {
      const results = await searchSerper(query);
      if (results.length === 0) return { success: true, data: { results: [], message: "No results found" } };
      return { success: true, data: { query, results } };
    } catch (err) {
      return { success: false, error: `Search failed: ${err instanceof Error ? err.message : "Unknown error"}` };
    }
  },

  // ─── PERSONS ───
  async persons_list(input) {
    const query = input.query as string | undefined;
    const lim = safeLimit(input);
    const searchFilter = query
      ? or(
          ilike(persons.name, `%${query}%`),
          ilike(persons.email, `%${query}%`),
          ilike(persons.position, `%${query}%`),
          ilike(persons.phone, `%${query}%`)
        )
      : undefined;
    const where = searchFilter
      ? and(isNull(persons.deletedAt), searchFilter)
      : isNull(persons.deletedAt);

    const results = await db
      .select({
        id: persons.id,
        name: persons.name,
        email: persons.email,
        phone: persons.phone,
        position: persons.position,
        linkedin: persons.linkedin,
        lastContactedAt: persons.lastContactedAt,
        companyName: companies.name,
        companyId: persons.companyId,
      })
      .from(persons)
      .leftJoin(companies, eq(persons.companyId, companies.id))
      .where(where)
      .orderBy(asc(persons.name))
      .limit(lim);
    return { success: true, data: results };
  },

  async persons_get(input) {
    const id = input.id as number;
    const [person] = await db.select().from(persons).where(eq(persons.id, id));
    if (!person) return { success: false, error: `Person with ID ${id} not found` };

    const company = person.companyId
      ? (await db.select().from(companies).where(eq(companies.id, person.companyId)))[0]
      : null;
    const personEmails = await db.select().from(emails).where(eq(emails.personId, id)).orderBy(desc(emails.createdAt)).limit(10);
    const personTodos = await db.select().from(todos).where(eq(todos.personId, id)).orderBy(desc(todos.createdAt));
    const personActivities = await db.select().from(activities).where(eq(activities.personId, id)).orderBy(desc(activities.createdAt)).limit(10);
    const personTags = await db
      .select({ id: entityTags.id, tagName: tags.name, tagColour: tags.colour })
      .from(entityTags)
      .innerJoin(tags, eq(entityTags.tagId, tags.id))
      .where(eq(entityTags.personId, id));

    return {
      success: true,
      data: { person, company, emails: personEmails, todos: personTodos, activities: personActivities, tags: personTags },
    };
  },

  async persons_create(input) {
    const name = (input.name as string)?.trim();
    if (!name) return { success: false, error: "Name is required" };
    const [created] = await db.insert(persons).values({
      name,
      email: (input.email as string)?.trim()?.toLowerCase() || null,
      phone: (input.phone as string)?.trim() || null,
      position: (input.position as string)?.trim() || null,
      linkedin: (input.linkedin as string)?.trim() || null,
      notes: (input.notes as string)?.trim() || null,
      companyId: (input.company_id as number) || null,
    }).returning();
    return { success: true, data: created };
  },

  async persons_update(input) {
    const id = input.id as number;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = (input.name as string).trim();
    if (input.email !== undefined) updates.email = (input.email as string)?.trim()?.toLowerCase() || null;
    if (input.phone !== undefined) updates.phone = (input.phone as string)?.trim() || null;
    if (input.position !== undefined) updates.position = (input.position as string)?.trim() || null;
    if (input.linkedin !== undefined) updates.linkedin = (input.linkedin as string)?.trim() || null;
    if (input.notes !== undefined) updates.notes = (input.notes as string)?.trim() || null;
    if (input.company_id !== undefined) updates.companyId = (input.company_id as number) || null;

    const [updated] = await db.update(persons).set(updates).where(eq(persons.id, id)).returning();
    if (!updated) return { success: false, error: `Person with ID ${id} not found` };
    return { success: true, data: updated };
  },

  async persons_delete(input) {
    const id = input.id as number;
    const [updated] = await db.update(persons).set({ deletedAt: new Date() }).where(eq(persons.id, id)).returning();
    if (!updated) return { success: false, error: `Person with ID ${id} not found` };
    return { success: true, data: { id, deleted: true, message: "Moved to trash (can be restored)" } };
  },

  async persons_mark_contacted(input) {
    const id = input.id as number;
    const [updated] = await db.update(persons).set({ lastContactedAt: new Date(), updatedAt: new Date() }).where(eq(persons.id, id)).returning();
    if (!updated) return { success: false, error: `Person with ID ${id} not found` };
    return { success: true, data: { id, lastContactedAt: updated.lastContactedAt } };
  },

  // ─── COMPANIES ───
  async companies_list(input) {
    const query = input.query as string | undefined;
    const lim = safeLimit(input);
    const searchFilter = query
      ? or(
          ilike(companies.name, `%${query}%`),
          ilike(companies.industry, `%${query}%`),
          ilike(companies.email, `%${query}%`),
          ilike(companies.website, `%${query}%`)
        )
      : undefined;
    const where = searchFilter
      ? and(isNull(companies.deletedAt), searchFilter)
      : isNull(companies.deletedAt);

    const results = await db
      .select({
        id: companies.id,
        name: companies.name,
        industry: companies.industry,
        website: companies.website,
        email: companies.email,
        phone: companies.phone,
        personCount: count(persons.id),
      })
      .from(companies)
      .leftJoin(persons, eq(companies.id, persons.companyId))
      .where(where)
      .groupBy(companies.id)
      .orderBy(asc(companies.name))
      .limit(lim);
    return { success: true, data: results };
  },

  async companies_get(input) {
    const id = input.id as number;
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    if (!company) return { success: false, error: `Company with ID ${id} not found` };

    const companyPersons = await db.select().from(persons).where(and(eq(persons.companyId, id), isNull(persons.deletedAt)));
    const companyEvents = await db.select().from(events).where(eq(events.companyId, id)).orderBy(desc(events.date));
    const companyActivities = await db.select().from(activities).where(eq(activities.companyId, id)).orderBy(desc(activities.createdAt)).limit(10);
    const companyTags = await db
      .select({ id: entityTags.id, tagName: tags.name, tagColour: tags.colour })
      .from(entityTags)
      .innerJoin(tags, eq(entityTags.tagId, tags.id))
      .where(eq(entityTags.companyId, id));

    return {
      success: true,
      data: { company, persons: companyPersons, events: companyEvents, activities: companyActivities, tags: companyTags },
    };
  },

  async companies_create(input) {
    const name = (input.name as string)?.trim();
    if (!name) return { success: false, error: "Company name is required" };
    const [created] = await db.insert(companies).values({
      name,
      website: (input.website as string)?.trim() || null,
      industry: (input.industry as string)?.trim() || null,
      email: (input.email as string)?.trim()?.toLowerCase() || null,
      phone: (input.phone as string)?.trim() || null,
      address: (input.address as string)?.trim() || null,
      notes: (input.notes as string)?.trim() || null,
    }).returning();
    return { success: true, data: created };
  },

  async companies_update(input) {
    const id = input.id as number;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = (input.name as string).trim();
    if (input.website !== undefined) updates.website = (input.website as string)?.trim() || null;
    if (input.industry !== undefined) updates.industry = (input.industry as string)?.trim() || null;
    if (input.email !== undefined) updates.email = (input.email as string)?.trim()?.toLowerCase() || null;
    if (input.phone !== undefined) updates.phone = (input.phone as string)?.trim() || null;
    if (input.address !== undefined) updates.address = (input.address as string)?.trim() || null;
    if (input.notes !== undefined) updates.notes = (input.notes as string)?.trim() || null;

    const [updated] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();
    if (!updated) return { success: false, error: `Company with ID ${id} not found` };
    return { success: true, data: updated };
  },

  async companies_delete(input) {
    const id = input.id as number;
    const [updated] = await db.update(companies).set({ deletedAt: new Date() }).where(eq(companies.id, id)).returning();
    if (!updated) return { success: false, error: `Company with ID ${id} not found` };
    return { success: true, data: { id, deleted: true, message: "Moved to trash (can be restored)" } };
  },

  // ─── EVENTS ───
  async events_list(input) {
    const query = input.query as string | undefined;
    const upcomingOnly = input.upcoming_only as boolean | undefined;
    const lim = safeLimit(input);
    const today = new Date().toISOString().split("T")[0];

    const filters = [];
    if (query) filters.push(ilike(events.name, `%${query}%`));
    if (upcomingOnly) filters.push(gte(events.date, today));

    const where = filters.length > 0 ? and(...filters) : undefined;

    const results = await db
      .select({
        id: events.id,
        name: events.name,
        date: events.date,
        location: events.location,
        status: events.status,
        companyName: companies.name,
        companyId: events.companyId,
      })
      .from(events)
      .leftJoin(companies, eq(events.companyId, companies.id))
      .where(where)
      .orderBy(asc(events.date))
      .limit(lim);
    return { success: true, data: results };
  },

  async events_get(input) {
    const id = input.id as number;
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) return { success: false, error: `Event with ID ${id} not found` };
    const company = event.companyId
      ? (await db.select().from(companies).where(eq(companies.id, event.companyId)))[0]
      : null;
    return { success: true, data: { event, company } };
  },

  async events_create(input) {
    const name = (input.name as string)?.trim();
    const date = input.date as string;
    if (!name) return { success: false, error: "Event name is required" };
    if (!date) return { success: false, error: "Event date is required" };
    const [created] = await db.insert(events).values({
      name,
      date,
      location: (input.location as string)?.trim() || null,
      description: (input.description as string)?.trim() || null,
      companyId: (input.company_id as number) || null,
    }).returning();
    return { success: true, data: created };
  },

  async events_update(input) {
    const id = input.id as number;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = (input.name as string).trim();
    if (input.date !== undefined) updates.date = input.date as string;
    if (input.location !== undefined) updates.location = (input.location as string)?.trim() || null;
    if (input.description !== undefined) updates.description = (input.description as string)?.trim() || null;
    if (input.company_id !== undefined) updates.companyId = (input.company_id as number) || null;
    if (input.status !== undefined) updates.status = input.status as string;

    const [updated] = await db.update(events).set(updates).where(eq(events.id, id)).returning();
    if (!updated) return { success: false, error: `Event with ID ${id} not found` };
    return { success: true, data: updated };
  },

  async events_delete(input) {
    const id = input.id as number;
    const [deleted] = await db.delete(events).where(eq(events.id, id)).returning();
    if (!deleted) return { success: false, error: `Event with ID ${id} not found` };
    return { success: true, data: { id, deleted: true } };
  },

  // ─── TODOS ───
  async todos_list(input) {
    const done = input.done as boolean | undefined;
    const query = input.query as string | undefined;
    const lim = safeLimit(input);

    const filters = [];
    if (done !== undefined) filters.push(eq(todos.done, done));
    if (query) filters.push(ilike(todos.title, `%${query}%`));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const results = await db
      .select({
        id: todos.id,
        title: todos.title,
        dueDate: todos.dueDate,
        done: todos.done,
        notes: todos.notes,
        personName: persons.name,
        personId: todos.personId,
        eventName: events.name,
        eventId: todos.eventId,
      })
      .from(todos)
      .leftJoin(persons, eq(todos.personId, persons.id))
      .leftJoin(events, eq(todos.eventId, events.id))
      .where(where)
      .orderBy(asc(todos.done), asc(todos.dueDate))
      .limit(lim);
    return { success: true, data: results };
  },

  async todos_get(input) {
    const id = input.id as number;
    const [todo] = await db.select().from(todos).where(eq(todos.id, id));
    if (!todo) return { success: false, error: `Todo with ID ${id} not found` };
    const person = todo.personId ? (await db.select().from(persons).where(eq(persons.id, todo.personId)))[0] : null;
    const event = todo.eventId ? (await db.select().from(events).where(eq(events.id, todo.eventId)))[0] : null;
    return { success: true, data: { todo, person, event } };
  },

  async todos_create(input) {
    const title = (input.title as string)?.trim();
    if (!title) return { success: false, error: "Title is required" };
    const [created] = await db.insert(todos).values({
      title,
      dueDate: (input.due_date as string) || null,
      notes: (input.notes as string)?.trim() || null,
      personId: (input.person_id as number) || null,
      eventId: (input.event_id as number) || null,
    }).returning();
    return { success: true, data: created };
  },

  async todos_update(input) {
    const id = input.id as number;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) updates.title = (input.title as string).trim();
    if (input.due_date !== undefined) updates.dueDate = (input.due_date as string) || null;
    if (input.notes !== undefined) updates.notes = (input.notes as string)?.trim() || null;
    if (input.person_id !== undefined) updates.personId = (input.person_id as number) || null;
    if (input.event_id !== undefined) updates.eventId = (input.event_id as number) || null;

    const [updated] = await db.update(todos).set(updates).where(eq(todos.id, id)).returning();
    if (!updated) return { success: false, error: `Todo with ID ${id} not found` };
    return { success: true, data: updated };
  },

  async todos_toggle(input) {
    const id = input.id as number;
    const done = input.done as boolean;
    const [updated] = await db.update(todos).set({ done, updatedAt: new Date() }).where(eq(todos.id, id)).returning();
    if (!updated) return { success: false, error: `Todo with ID ${id} not found` };
    return { success: true, data: updated };
  },

  async todos_delete(input) {
    const id = input.id as number;
    const [deleted] = await db.delete(todos).where(eq(todos.id, id)).returning();
    if (!deleted) return { success: false, error: `Todo with ID ${id} not found` };
    return { success: true, data: { id, deleted: true } };
  },

  // ─── EMAILS ───
  async emails_list(input) {
    const direction = input.direction as string | undefined;
    const status = input.status as string | undefined;
    const query = input.query as string | undefined;
    const lim = safeLimit(input);

    const filters = [];
    if (direction) filters.push(eq(emails.direction, direction));
    if (status) filters.push(eq(emails.status, status));
    if (query) filters.push(or(ilike(emails.subject, `%${query}%`), ilike(emails.fromAddress, `%${query}%`), ilike(emails.toAddress, `%${query}%`)));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const results = await db
      .select({
        id: emails.id,
        direction: emails.direction,
        fromAddress: emails.fromAddress,
        toAddress: emails.toAddress,
        subject: emails.subject,
        status: emails.status,
        read: emails.read,
        personName: persons.name,
        createdAt: emails.createdAt,
      })
      .from(emails)
      .leftJoin(persons, eq(emails.personId, persons.id))
      .where(where)
      .orderBy(desc(emails.createdAt))
      .limit(lim);
    return { success: true, data: results };
  },

  async emails_get(input) {
    const id = input.id as number;
    const [email] = await db.select().from(emails).where(eq(emails.id, id));
    if (!email) return { success: false, error: `Email with ID ${id} not found` };
    const person = email.personId ? (await db.select().from(persons).where(eq(persons.id, email.personId)))[0] : null;
    return { success: true, data: { email, person } };
  },

  async emails_send(input) {
    const to = (input.to as string)?.trim();
    const subject = (input.subject as string)?.trim();
    const rawBody = (input.body as string)?.trim();
    if (!to || !subject || !rawBody) return { success: false, error: "to, subject, and body are all required" };

    const from = (input.from as string)?.trim() || FROM_ADDRESS;

    // Append signature
    const signature = await getSetting("email_signature");
    const body = signature ? `${rawBody}\n\n${signature}` : rawBody;

    const { messageId } = await sendSmtpEmail({ from, to, subject, text: body });

    // Auto-link to person
    const [matchedPerson] = await db.select({ id: persons.id }).from(persons).where(ilike(persons.email, to)).limit(1);
    const personId = matchedPerson?.id || null;

    const [created] = await db.insert(emails).values({
      resendId: messageId,
      direction: "outbound",
      fromAddress: from,
      toAddress: to,
      subject,
      bodyText: body,
      personId,
      status: "sent",
      read: true,
    }).returning();

    if (personId) {
      await db.update(persons).set({ lastContactedAt: new Date(), updatedAt: new Date() }).where(eq(persons.id, personId));
    }

    return { success: true, data: { ...created, message: `Email sent to ${to}` } };
  },

  async emails_save_draft(input) {
    const from = (input.from as string)?.trim() || FROM_ADDRESS;
    const to = (input.to as string)?.trim() || "";

    const [matchedPerson] = to
      ? await db.select({ id: persons.id }).from(persons).where(ilike(persons.email, to)).limit(1)
      : [null];

    const [created] = await db.insert(emails).values({
      direction: "outbound",
      fromAddress: from,
      toAddress: to,
      subject: (input.subject as string)?.trim() || null,
      bodyText: (input.body as string)?.trim() || null,
      personId: matchedPerson?.id || null,
      status: "draft",
      read: true,
    }).returning();
    return { success: true, data: { ...created, message: "Draft saved" } };
  },

  async emails_update(input) {
    const id = input.id as number;
    const [existing] = await db.select().from(emails).where(eq(emails.id, id)).limit(1);
    if (!existing) return { success: false, error: `Email with ID ${id} not found` };
    if (existing.status !== "draft") return { success: false, error: "Only drafts can be edited" };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.to !== undefined) updates.toAddress = (input.to as string).trim();
    if (input.subject !== undefined) updates.subject = (input.subject as string).trim();
    if (input.body !== undefined) updates.bodyText = (input.body as string).trim();
    if (input.from !== undefined) {
      updates.fromAddress = input.from as string;
    }

    const [updated] = await db.update(emails).set(updates).where(eq(emails.id, id)).returning();
    return { success: true, data: { ...updated, message: "Draft updated" } };
  },

  // ─── ACTIVITIES ───
  async activities_list(input) {
    const personId = input.person_id as number | undefined;
    const companyId = input.company_id as number | undefined;
    const lim = safeLimit(input);

    const filters = [];
    if (personId) filters.push(eq(activities.personId, personId));
    if (companyId) filters.push(eq(activities.companyId, companyId));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const results = await db.select().from(activities).where(where).orderBy(desc(activities.createdAt)).limit(lim);
    return { success: true, data: results };
  },

  async activities_create(input) {
    const type = input.type as string;
    const title = (input.title as string)?.trim();
    if (!type || !title) return { success: false, error: "type and title are required" };

    const [created] = await db.insert(activities).values({
      type,
      title,
      notes: (input.notes as string)?.trim() || null,
      personId: (input.person_id as number) || null,
      companyId: (input.company_id as number) || null,
    }).returning();
    return { success: true, data: created };
  },

  // ─── TAGS ───
  async tags_list() {
    const results = await db.select().from(tags).orderBy(tags.name);
    return { success: true, data: results };
  },

  async tags_create(input) {
    const name = (input.name as string)?.trim();
    if (!name) return { success: false, error: "Tag name is required" };
    const [created] = await db.insert(tags).values({
      name,
      colour: (input.colour as string) || "#6b7280",
    }).onConflictDoNothing().returning();
    if (!created) return { success: true, data: { message: `Tag "${name}" already exists` } };
    return { success: true, data: created };
  },

  async tags_add_to_entity(input) {
    const tagId = input.tag_id as number;
    const personId = input.person_id as number | undefined;
    const companyId = input.company_id as number | undefined;
    if (!personId && !companyId) return { success: false, error: "Provide either person_id or company_id" };

    const [created] = await db.insert(entityTags).values({
      tagId,
      personId: personId || null,
      companyId: companyId || null,
    }).returning();
    return { success: true, data: created };
  },

  async tags_remove_from_entity(input) {
    const id = input.entity_tag_id as number;
    const [deleted] = await db.delete(entityTags).where(eq(entityTags.id, id)).returning();
    if (!deleted) return { success: false, error: `Entity-tag with ID ${id} not found` };
    return { success: true, data: { id, removed: true } };
  },

  async linkedin_verify(input) {
    const url = input.url as string;
    if (!url) return { success: false, error: "URL is required" };
    const result = await checkLinkedIn(url);
    return { success: true, data: { url, valid: result.valid, status: result.status } };
  },

  async linkedin_verify_all() {
    const allWithLinkedIn = await db
      .select({ id: persons.id, name: persons.name, linkedin: persons.linkedin })
      .from(persons)
      .where(and(isNull(persons.deletedAt), sql`${persons.linkedin} IS NOT NULL AND ${persons.linkedin} != ''`));

    const results: { id: number; name: string; linkedin: string; valid: boolean }[] = [];
    for (const p of allWithLinkedIn) {
      if (!p.linkedin) continue;
      const check = await checkLinkedIn(p.linkedin);
      results.push({ id: p.id, name: p.name, linkedin: p.linkedin, valid: check.valid });
      await new Promise((r) => setTimeout(r, 500));
    }

    return {
      success: true,
      data: {
        total: results.length,
        valid: results.filter((r) => r.valid).length,
        invalid: results.filter((r) => !r.valid),
        all: results,
      },
    };
  },

  async navigate(input) {
    const url = input.url as string;
    if (!url || !url.startsWith("/")) return { success: false, error: "Invalid URL path - must start with /" };
    return { success: true, data: { url } };
  },
};

// ─── Public executor ───

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<ToolResult> {
  const executor = executors[toolName];
  if (!executor) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  try {
    return await executor(toolInput);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Tool ${toolName} failed:`, message);
    return { success: false, error: message };
  }
}
