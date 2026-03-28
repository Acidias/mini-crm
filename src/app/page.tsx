import Link from "next/link";
import { db } from "@/db";
import { companies, persons, events } from "@/db/schema";
import { count, desc, isNull, lt, sql, gte, asc, eq } from "drizzle-orm";

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
  const [personCount] = await db.select({ value: count() }).from(persons);
  const [companyCount] = await db.select({ value: count() }).from(companies);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentlyContactedCount] = await db
    .select({ value: count() })
    .from(persons)
    .where(sql`${persons.lastContactedAt} >= ${sevenDaysAgo}`);

  const [neverContactedCount] = await db
    .select({ value: count() })
    .from(persons)
    .where(isNull(persons.lastContactedAt));

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
      sql`${persons.lastContactedAt} IS NULL OR ${persons.lastContactedAt} < ${sevenDaysAgo}`
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
    .orderBy(desc(persons.createdAt))
    .limit(5);

  const recentCompanies = await db
    .select()
    .from(companies)
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

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/persons/new"
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            + Add Person
          </Link>
          <Link
            href="/events/new"
            className="bg-white text-foreground border border-border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            + Add Event
          </Link>
          <Link
            href="/companies/new"
            className="bg-white text-foreground border border-border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            + Add Company
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card-bg rounded-xl border border-border p-5">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">Total Persons</p>
          <p className="text-3xl font-bold mt-1">{personCount.value}</p>
        </div>
        <div className="bg-card-bg rounded-xl border border-border p-5">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">Total Companies</p>
          <p className="text-3xl font-bold mt-1">{companyCount.value}</p>
        </div>
        <div className="bg-card-bg rounded-xl border border-border p-5">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">Contacted (7d)</p>
          <p className="text-3xl font-bold mt-1 text-success">{recentlyContactedCount.value}</p>
        </div>
        <div className="bg-card-bg rounded-xl border border-border p-5">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">Never Contacted</p>
          <p className="text-3xl font-bold mt-1 text-danger">{neverContactedCount.value}</p>
        </div>
      </div>

      {/* Needs follow-up */}
      <div className="bg-card-bg rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Needs Follow-up</h2>
          <span className="text-xs text-muted">Not contacted in 7+ days or never</span>
        </div>
        {needsFollowUp.length === 0 ? (
          <p className="text-muted text-sm">Everyone is up to date!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-xs uppercase tracking-wide">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Position</th>
                <th className="pb-2 font-medium">Company</th>
                <th className="pb-2 font-medium">Last Contacted</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {needsFollowUp.map((p) => (
                <tr key={p.id} className="border-t border-border">
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
                    <Link
                      href={`/persons/${p.id}/edit`}
                      className="text-accent text-xs hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upcoming events */}
      <div className="bg-card-bg rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Upcoming Events</h2>
          <Link href="/events" className="text-accent text-xs hover:underline">View all</Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-muted text-sm">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-1.5 border-t border-border first:border-0">
                <div className="flex items-center gap-3">
                  <div className="text-center bg-gray-100 rounded-lg px-2.5 py-1 min-w-[3rem]">
                    <p className="text-xs text-muted leading-tight">
                      {new Date(e.date + "T00:00:00").toLocaleDateString("en-GB", { month: "short" })}
                    </p>
                    <p className="text-lg font-bold leading-tight">
                      {new Date(e.date + "T00:00:00").getDate()}
                    </p>
                  </div>
                  <div>
                    <Link href={`/events/${e.id}/edit`} className="text-accent hover:underline text-sm font-medium">
                      {e.name}
                    </Link>
                    <p className="text-muted text-xs">
                      {e.location && <>{e.location}</>}
                      {e.location && e.companyName && <> &middot; </>}
                      {e.companyName && <>{e.companyName}</>}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  e.status === "upcoming" ? "bg-blue-100 text-blue-700" :
                  e.status === "attended" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent additions */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card-bg rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recently Added Persons</h2>
            <Link href="/persons" className="text-accent text-xs hover:underline">View all</Link>
          </div>
          {recentPersons.length === 0 ? (
            <p className="text-muted text-sm">No persons yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPersons.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-t border-border first:border-0">
                  <div>
                    <Link href={`/persons/${p.id}/edit`} className="text-accent hover:underline text-sm font-medium">
                      {p.name}
                    </Link>
                    {p.position && (
                      <span className="text-muted text-xs ml-2">{p.position}</span>
                    )}
                    {p.companyName && (
                      <span className="text-muted text-xs ml-1">at {p.companyName}</span>
                    )}
                  </div>
                  <span className="text-muted text-xs">{timeAgo(p.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card-bg rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recently Added Companies</h2>
            <Link href="/companies" className="text-accent text-xs hover:underline">View all</Link>
          </div>
          {recentCompanies.length === 0 ? (
            <p className="text-muted text-sm">No companies yet.</p>
          ) : (
            <div className="space-y-2">
              {recentCompanies.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-t border-border first:border-0">
                  <div>
                    <Link href={`/companies/${c.id}/edit`} className="text-accent hover:underline text-sm font-medium">
                      {c.name}
                    </Link>
                    {c.industry && (
                      <span className="text-muted text-xs ml-2">{c.industry}</span>
                    )}
                  </div>
                  <span className="text-muted text-xs">{timeAgo(c.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
