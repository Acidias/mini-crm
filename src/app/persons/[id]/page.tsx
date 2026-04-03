import Link from "next/link";
import { db } from "@/db";
import { persons, companies, emails, todos, events, activities } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { markAsContacted } from "@/actions/persons";
import { createActivity, deleteActivity } from "@/actions/activities";
import { getAllTags, getTagsForPerson } from "@/actions/tags";
import ConfirmDelete from "@/components/confirm-delete";
import TagManager from "@/components/tag-manager";

function timeAgo(date: Date | null): string {
  if (!date) return "Never";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [person] = await db.select().from(persons).where(eq(persons.id, parseInt(id)));
  if (!person) notFound();

  const linkedCompany = person.companyId
    ? (await db.select().from(companies).where(eq(companies.id, person.companyId)))[0]
    : null;

  const personEmails = await db
    .select()
    .from(emails)
    .where(eq(emails.personId, person.id))
    .orderBy(desc(emails.createdAt))
    .limit(20);

  const personTodos = await db
    .select({ id: todos.id, title: todos.title, dueDate: todos.dueDate, done: todos.done, eventName: events.name })
    .from(todos)
    .leftJoin(events, eq(todos.eventId, events.id))
    .where(eq(todos.personId, person.id))
    .orderBy(desc(todos.createdAt));

  const personActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.personId, person.id))
    .orderBy(desc(activities.createdAt));

  const personTags = await getTagsForPerson(person.id);
  const allTagsList = await getAllTags();

  const isStale = !person.lastContactedAt || Date.now() - person.lastContactedAt.getTime() > 7 * 24 * 60 * 60 * 1000;

  const priorityLabel = (p: number | null) => {
    const v = p || 5;
    if (v <= 3) return { text: `${v} - Low`, cls: "bg-stone-100 text-stone-600" };
    if (v <= 6) return { text: `${v} - Medium`, cls: "bg-blue-100 text-blue-700" };
    if (v <= 8) return { text: `${v} - High`, cls: "bg-amber-100 text-amber-700" };
    return { text: `${v} - Critical`, cls: "bg-red-100 text-red-700" };
  };
  const priority = priorityLabel(person.priority);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/persons" className="text-muted text-sm hover:text-foreground">&larr; Back to Persons</Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold">{person.name}</h1>
            <p className="text-muted text-sm">
              {person.position && <>{person.position}</>}
              {person.position && linkedCompany && <> at </>}
              {linkedCompany && (
                <Link href={`/companies/${linkedCompany.id}`} className="text-accent hover:underline">{linkedCompany.name}</Link>
              )}
              {!person.position && !linkedCompany && <>Added {person.createdAt.toLocaleDateString("en-GB")}</>}
              {person.linkedin && (
                <> - <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">LinkedIn</a></>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {person.linkedin ? (
              <a
                href={person.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#0A66C2] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#004182] transition-colors"
              >
                View LinkedIn
              </a>
            ) : (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`${person.name}${linkedCompany ? ` ${linkedCompany.name}` : ""} LinkedIn`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[#0A66C2] text-[#0A66C2] px-4 py-2 rounded-lg text-sm hover:bg-teal-50 transition-colors"
              >
                Find on LinkedIn
              </a>
            )}
            {person.email && (
              <Link href={`/emails/compose?to=${encodeURIComponent(person.email)}`} className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors">
                Send Email
              </Link>
            )}
            <Link href={`/persons/${person.id}/edit`} className="border border-border px-4 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm mb-6">
        <h2 className="font-semibold mb-3 text-sm">Tags</h2>
        <TagManager entityType="person" entityId={person.id} currentTags={personTags} allTags={allTagsList} />
      </div>

      {/* Info + Contact status */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm col-span-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Email</p>
              <p>{person.email || "-"}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Phone</p>
              <p>{person.phone || "-"}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Position</p>
              <p>{person.position || "-"}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Company</p>
              <p>{linkedCompany ? <Link href={`/companies/${linkedCompany.id}`} className="text-accent hover:underline">{linkedCompany.name}</Link> : "-"}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">LinkedIn</p>
              <p>{person.linkedin ? <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{person.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "")}</a> : "-"}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Priority</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${priority.cls}`}>{priority.text}</span>
            </div>
            {person.notes && (
              <div className="col-span-2">
                <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Notes</p>
                <p className="whitespace-pre-wrap">{person.notes}</p>
              </div>
            )}
          </div>
        </div>
        <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-muted text-xs uppercase tracking-wide font-medium">Last Contacted</p>
            <p className={`text-2xl font-bold mt-1 ${isStale ? "text-danger" : "text-success"}`}>
              {timeAgo(person.lastContactedAt)}
            </p>
          </div>
          <form action={markAsContacted.bind(null, person.id)}>
            <button type="submit" className="w-full bg-success text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
              Mark Contacted
            </button>
          </form>
        </div>
      </div>

      {/* Email history */}
      <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Email History ({personEmails.length})</h2>
          {person.email && (
            <Link href={`/emails/compose?to=${encodeURIComponent(person.email)}`} className="text-accent text-xs hover:underline">Compose</Link>
          )}
        </div>
        {personEmails.length === 0 ? (
          <p className="text-muted text-sm">No emails exchanged.</p>
        ) : (
          <div className="space-y-2">
            {personEmails.map((e) => (
              <div key={e.id} className="flex items-center gap-3 border-t border-border pt-2 first:border-0 first:pt-0">
                <span className={`text-xs font-bold ${e.direction === "inbound" ? "text-green-600" : "text-teal-600"}`}>
                  {e.direction === "inbound" ? "IN" : "OUT"}
                </span>
                <Link href={`/emails/${e.id}`} className="text-sm hover:text-accent truncate flex-1">
                  {e.subject || "(No subject)"}
                </Link>
                <span className="text-xs text-muted flex-shrink-0">{timeAgo(e.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Todos */}
        <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">To-Dos ({personTodos.length})</h2>
            <Link href="/todos/new" className="text-accent text-xs hover:underline">+ Add</Link>
          </div>
          {personTodos.length === 0 ? (
            <p className="text-muted text-sm">No tasks.</p>
          ) : (
            <div className="space-y-1.5">
              {personTodos.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className={`text-xs ${t.done ? "text-success" : "text-muted"}`}>{t.done ? "\u2713" : "\u25CB"}</span>
                  <Link href={`/todos/${t.id}/edit`} className={`text-sm hover:text-accent ${t.done ? "line-through text-muted" : ""}`}>
                    {t.title}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Company info (if linked) */}
        {linkedCompany && (
          <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm">
            <h2 className="font-semibold mb-3">Company</h2>
            <div className="space-y-2 text-sm">
              <p><Link href={`/companies/${linkedCompany.id}`} className="text-accent hover:underline font-medium">{linkedCompany.name}</Link></p>
              {linkedCompany.industry && <p className="text-muted">{linkedCompany.industry}</p>}
              {linkedCompany.website && <p className="text-muted">{linkedCompany.website}</p>}
              {linkedCompany.email && <p className="text-muted">{linkedCompany.email}</p>}
              {linkedCompany.phone && <p className="text-muted">{linkedCompany.phone}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm">
        <h2 className="font-semibold mb-4">Activity Log</h2>
        <form action={createActivity} className="flex gap-2 mb-4">
          <input type="hidden" name="personId" value={person.id} />
          {person.companyId && <input type="hidden" name="companyId" value={person.companyId} />}
          <input type="hidden" name="returnTo" value={`/persons/${person.id}`} />
          <select name="type" className="border border-border rounded-lg px-2 py-1.5 text-sm">
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="email">Email</option>
            <option value="other">Other</option>
          </select>
          <input name="title" required placeholder="What happened?" className="border border-border rounded-lg flex-1 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
          <button type="submit" className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm hover:bg-accent-hover transition-colors">Add</button>
        </form>
        {personActivities.length === 0 ? (
          <p className="text-muted text-sm">No activities recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {personActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${
                  a.type === "call" ? "bg-green-100 text-green-700" :
                  a.type === "meeting" ? "bg-violet-50 text-violet-700" :
                  a.type === "email" ? "bg-teal-50 text-teal-700" :
                  "bg-stone-100 text-stone-600"
                }`}>{a.type}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.notes && <p className="text-muted text-xs mt-0.5">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted">{timeAgo(a.createdAt)}</span>
                  <ConfirmDelete action={deleteActivity.bind(null, a.id)} label="x" message="Delete this activity?" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
