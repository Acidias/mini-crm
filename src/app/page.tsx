import Link from "next/link";
import { db } from "@/db";
import { companies, persons, events, todos } from "@/db/schema";
import { count, desc, isNull, lt, sql, gte, asc, eq, and } from "drizzle-orm";

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

export const dynamic = "force-dynamic";

export default async function Home() {
  const [personCount] = await db.select({ value: count() }).from(persons).where(isNull(persons.deletedAt));
  const [companyCount] = await db.select({ value: count() }).from(companies).where(isNull(companies.deletedAt));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentlyContactedCount] = await db
    .select({ value: count() })
    .from(persons)
    .where(and(isNull(persons.deletedAt), sql`${persons.lastContactedAt} >= ${sevenDaysAgo}`));

  const [neverContactedCount] = await db
    .select({ value: count() })
    .from(persons)
    .where(and(isNull(persons.deletedAt), isNull(persons.lastContactedAt)));

  const needsFollowUp = await db
    .select({
      id: persons.id,
      name: persons.name,
      email: persons.email,
      position: persons.position,
      lastContactedAt: persons.lastContactedAt,
      companyName: companies.name,
    })
    .from(persons)
    .leftJoin(companies, sql`${persons.companyId} = ${companies.id}`)
    .where(
      and(
        isNull(persons.deletedAt),
        sql`(${persons.lastContactedAt} IS NULL OR ${persons.lastContactedAt} < ${sevenDaysAgo})`
      )
    )
    .orderBy(persons.lastContactedAt)
    .limit(10);

  const recentPersons = await db
    .select({
      id: persons.id,
      name: persons.name,
      email: persons.email,
      position: persons.position,
      companyName: companies.name,
      createdAt: persons.createdAt,
    })
    .from(persons)
    .leftJoin(companies, sql`${persons.companyId} = ${companies.id}`)
    .where(isNull(persons.deletedAt))
    .orderBy(desc(persons.createdAt))
    .limit(5);

  const recentCompanies = await db
    .select()
    .from(companies)
    .where(isNull(companies.deletedAt))
    .orderBy(desc(companies.createdAt))
    .limit(5);

  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      location: events.location,
      status: events.status,
      companyName: companies.name,
    })
    .from(events)
    .leftJoin(companies, eq(events.companyId, companies.id))
    .where(gte(events.date, today))
    .orderBy(asc(events.date))
    .limit(5);

  const pendingTodos = await db
    .select({
      id: todos.id,
      title: todos.title,
      dueDate: todos.dueDate,
      done: todos.done,
      personName: persons.name,
    })
    .from(todos)
    .leftJoin(persons, eq(todos.personId, persons.id))
    .where(eq(todos.done, false))
    .orderBy(asc(todos.dueDate))
    .limit(5);

  const stats = [
    { label: "Persons", value: personCount.value, color: "bg-teal-500/10 text-teal-600", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
    { label: "Companies", value: companyCount.value, color: "bg-violet-500/10 text-violet-600", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/></svg> },
    { label: "Contacted (7d)", value: recentlyContactedCount.value, color: "bg-emerald-500/10 text-emerald-600", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
    { label: "Never Contacted", value: neverContactedCount.value, color: "bg-rose-500/10 text-rose-600", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  ];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted text-sm mt-0.5">Overview of your contacts and activities</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/persons/new"
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            + Add Person
          </Link>
          <Link
            href="/events/new"
            className="bg-card-bg text-foreground border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            + Add Event
          </Link>
          <Link
            href="/companies/new"
            className="bg-card-bg text-foreground border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            + Add Company
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted text-xs font-semibold uppercase tracking-wider">{s.label}</p>
              <span className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center`}>
                {s.icon}
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main content - 2 column layout */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Follow-up - takes 2 cols */}
        <div className="col-span-2 bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold tracking-tight">Needs Follow-up</h2>
            <span className="text-[11px] text-muted bg-stone-100 px-2 py-0.5 rounded-full">7+ days or never</span>
          </div>
          {needsFollowUp.length === 0 ? (
            <p className="text-muted text-sm py-4">Everyone is up to date!</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-[11px] uppercase tracking-wider">
                  <th className="pb-2.5 font-semibold">Name</th>
                  <th className="pb-2.5 font-semibold">Position</th>
                  <th className="pb-2.5 font-semibold">Company</th>
                  <th className="pb-2.5 font-semibold">Last Contacted</th>
                  <th className="pb-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {needsFollowUp.map((p) => (
                  <tr key={p.id} className="border-t border-border/50 hover:bg-stone-50/50">
                    <td className="py-2.5">
                      <Link href={`/persons/${p.id}/edit`} className="text-accent hover:underline font-medium">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2.5 text-muted">{p.position || "-"}</td>
                    <td className="py-2.5 text-muted">{p.companyName || "-"}</td>
                    <td className="py-2.5">
                      <span className={p.lastContactedAt ? "text-muted" : "text-danger font-medium"}>
                        {timeAgo(p.lastContactedAt)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/persons/${p.id}/edit`} className="text-accent text-xs hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending todos - 1 col */}
        <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold tracking-tight">Pending To-Dos</h2>
            <Link href="/todos" className="text-accent text-xs font-medium hover:underline">View all</Link>
          </div>
          {pendingTodos.length === 0 ? (
            <p className="text-muted text-sm py-4">No pending tasks.</p>
          ) : (
            <div className="space-y-0.5">
              {pendingTodos.map((t) => (
                <div key={t.id} className="flex items-start gap-2.5 py-2 border-t border-border/50 first:border-0">
                  <span className="w-4 h-4 rounded-full border-2 border-stone-300 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/todos/${t.id}/edit`} className="text-sm font-medium text-foreground hover:text-accent transition-colors block truncate">
                      {t.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.personName && (
                        <span className="text-[11px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-medium">
                          {t.personName}
                        </span>
                      )}
                      {t.dueDate && (
                        <span className={`text-[11px] ${t.dueDate < today ? "text-danger font-semibold" : "text-muted"}`}>
                          {new Date(t.dueDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold tracking-tight">Upcoming Events</h2>
          <Link href="/events" className="text-accent text-xs font-medium hover:underline">View all</Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-muted text-sm py-4">No upcoming events.</p>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {upcomingEvents.map((e) => (
              <Link key={e.id} href={`/events/${e.id}/edit`} className="group border border-border/60 rounded-xl p-3.5 hover:border-accent/30 hover:shadow-sm transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                    {new Date(e.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    e.status === "upcoming" ? "bg-teal-50 text-teal-700" :
                    e.status === "attended" ? "bg-emerald-50 text-emerald-600" :
                    "bg-stone-100 text-stone-500"
                  }`}>
                    {e.status}
                  </span>
                </div>
                <p className="text-sm font-medium group-hover:text-accent transition-colors truncate">{e.name}</p>
                <p className="text-[11px] text-muted truncate mt-0.5">
                  {[e.location, e.companyName].filter(Boolean).join(" - ") || "No details"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent additions */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold tracking-tight">Recently Added Persons</h2>
            <Link href="/persons" className="text-accent text-xs font-medium hover:underline">View all</Link>
          </div>
          {recentPersons.length === 0 ? (
            <p className="text-muted text-sm">No persons yet.</p>
          ) : (
            <div className="space-y-0">
              {recentPersons.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-t border-border/50 first:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-[11px] font-semibold text-stone-500">
                      {p.name[0]}
                    </span>
                    <div>
                      <Link href={`/persons/${p.id}/edit`} className="text-sm font-medium hover:text-accent transition-colors">
                        {p.name}
                      </Link>
                      <p className="text-[11px] text-muted">
                        {[p.position, p.companyName].filter(Boolean).join(" at ") || p.email || ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-muted text-[11px]">{timeAgo(p.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold tracking-tight">Recently Added Companies</h2>
            <Link href="/companies" className="text-accent text-xs font-medium hover:underline">View all</Link>
          </div>
          {recentCompanies.length === 0 ? (
            <p className="text-muted text-sm">No companies yet.</p>
          ) : (
            <div className="space-y-0">
              {recentCompanies.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-t border-border/50 first:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center text-[11px] font-semibold text-violet-500">
                      {c.name[0]}
                    </span>
                    <div>
                      <Link href={`/companies/${c.id}/edit`} className="text-sm font-medium hover:text-accent transition-colors">
                        {c.name}
                      </Link>
                      {c.industry && <p className="text-[11px] text-muted">{c.industry}</p>}
                    </div>
                  </div>
                  <span className="text-muted text-[11px]">{timeAgo(c.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
