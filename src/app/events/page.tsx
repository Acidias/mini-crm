import Link from "next/link";
import { db } from "@/db";
import { events, companies } from "@/db/schema";
import { desc, eq, gte, lt, asc } from "drizzle-orm";
import { deleteEvent, updateEventStatus } from "@/actions/events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
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
    .orderBy(asc(events.date));

  const pastEvents = await db
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
    .where(lt(events.date, today))
    .orderBy(desc(events.date));

  const totalEvents = upcomingEvents.length + pastEvents.length;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted text-sm mt-1">
            {totalEvents} total &middot; {upcomingEvents.length} upcoming
          </p>
        </div>
        <Link
          href="/events/new"
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          + Add Event
        </Link>
      </div>

      {/* Upcoming */}
      <div className="mb-8">
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Upcoming
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="bg-card-bg rounded-xl border border-border p-8 text-center">
            <p className="text-muted mb-3">No upcoming events.</p>
            <Link href="/events/new" className="text-accent hover:underline text-sm">
              Plan your next event
            </Link>
          </div>
        ) : (
          <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide bg-gray-50">
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((e) => (
                  <tr key={e.id} className="border-t border-border hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/events/${e.id}/edit`}
                        className="text-accent hover:underline font-medium"
                      >
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {new Date(e.date + "T00:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 text-muted">{e.location || "-"}</td>
                    <td className="px-5 py-3 text-muted">{e.companyName || "-"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-3 justify-end items-center">
                        <form action={updateEventStatus.bind(null, e.id, "attended")}>
                          <button type="submit" className="text-success text-xs hover:underline">
                            Attended
                          </button>
                        </form>
                        <Link href={`/events/${e.id}/edit`} className="text-accent text-xs hover:underline">
                          Edit
                        </Link>
                        <form action={deleteEvent.bind(null, e.id)}>
                          <button type="submit" className="text-danger text-xs hover:underline">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
            Past
          </h2>
          <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide bg-gray-50">
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastEvents.map((e) => (
                  <tr key={e.id} className="border-t border-border hover:bg-gray-50/50 opacity-70">
                    <td className="px-5 py-3">
                      <Link
                        href={`/events/${e.id}/edit`}
                        className="text-accent hover:underline font-medium"
                      >
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {new Date(e.date + "T00:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 text-muted">{e.location || "-"}</td>
                    <td className="px-5 py-3 text-muted">{e.companyName || "-"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-3 justify-end items-center">
                        <Link href={`/events/${e.id}/edit`} className="text-accent text-xs hover:underline">
                          Edit
                        </Link>
                        <form action={deleteEvent.bind(null, e.id)}>
                          <button type="submit" className="text-danger text-xs hover:underline">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700",
    attended: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.upcoming}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
