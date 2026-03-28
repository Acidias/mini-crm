import Link from "next/link";
import { db } from "@/db";
import { companies, persons, events, emails, todos, activities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { createActivity, deleteActivity } from "@/actions/activities";
import ConfirmDelete from "@/components/confirm-delete";

function timeAgo(date: Date): string {
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

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company] = await db.select().from(companies).where(eq(companies.id, parseInt(id)));
  if (!company) notFound();

  const companyPersons = await db.select().from(persons).where(eq(persons.companyId, company.id));
  const companyEvents = await db.select().from(events).where(eq(events.companyId, company.id)).orderBy(desc(events.date));
  const companyTodos = await db.select().from(todos).where(eq(todos.personId, company.id));
  const companyActivities = await db.select().from(activities).where(eq(activities.companyId, company.id)).orderBy(desc(activities.createdAt));

  // Get emails for all persons linked to this company
  const personIds = companyPersons.map((p) => p.id);
  const companyEmails = personIds.length > 0
    ? await db.select().from(emails).where(
        eq(emails.personId, personIds[0]) // simplified - gets first person's emails
      ).orderBy(desc(emails.createdAt)).limit(10)
    : [];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/companies" className="text-muted text-sm hover:text-foreground">&larr; Back to Companies</Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-muted text-sm">
              {company.industry && <>{company.industry} &middot; </>}
              Added {company.createdAt.toLocaleDateString("en-GB")}
            </p>
          </div>
          <Link href={`/companies/${company.id}/edit`} className="border border-border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Edit
          </Link>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-card-bg rounded-xl border border-border p-5 mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Website</p>
          <p>{company.website || "-"}</p>
        </div>
        <div>
          <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Email</p>
          <p>{company.email || "-"}</p>
        </div>
        <div>
          <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Phone</p>
          <p>{company.phone || "-"}</p>
        </div>
        <div>
          <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Address</p>
          <p>{company.address || "-"}</p>
        </div>
        {company.notes && (
          <div className="col-span-2">
            <p className="text-muted text-xs uppercase tracking-wide font-medium mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{company.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Persons */}
        <div className="bg-card-bg rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Persons ({companyPersons.length})</h2>
            <Link href={`/persons/new`} className="text-accent text-xs hover:underline">+ Add</Link>
          </div>
          {companyPersons.length === 0 ? (
            <p className="text-muted text-sm">No persons linked.</p>
          ) : (
            <div className="space-y-2">
              {companyPersons.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <Link href={`/persons/${p.id}`} className="text-accent hover:underline text-sm font-medium">{p.name}</Link>
                    {p.position && <span className="text-muted text-xs ml-2">{p.position}</span>}
                  </div>
                  {p.email && <span className="text-muted text-xs">{p.email}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Events */}
        <div className="bg-card-bg rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Events ({companyEvents.length})</h2>
            <Link href={`/events/new`} className="text-accent text-xs hover:underline">+ Add</Link>
          </div>
          {companyEvents.length === 0 ? (
            <p className="text-muted text-sm">No events.</p>
          ) : (
            <div className="space-y-2">
              {companyEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <Link href={`/events/${e.id}/edit`} className="text-accent hover:underline text-sm">{e.name}</Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    e.status === "attended" ? "bg-green-100 text-green-700" :
                    e.status === "cancelled" ? "bg-gray-100 text-gray-500" :
                    "bg-blue-100 text-blue-700"
                  }`}>{e.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-card-bg rounded-xl border border-border p-5 mb-6">
        <h2 className="font-semibold mb-4">Activity Log</h2>

        {/* Add activity form */}
        <form action={createActivity} className="flex gap-2 mb-4">
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="returnTo" value={`/companies/${company.id}`} />
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

        {companyActivities.length === 0 ? (
          <p className="text-muted text-sm">No activities recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {companyActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${
                  a.type === "call" ? "bg-green-100 text-green-700" :
                  a.type === "meeting" ? "bg-purple-100 text-purple-700" :
                  a.type === "email" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-600"
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
