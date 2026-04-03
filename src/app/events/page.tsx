import Link from "next/link";
import { db } from "@/db";
import { events, companies } from "@/db/schema";
import { desc, eq, asc, ilike, or, count, and } from "drizzle-orm";
import { deleteEvent, updateEventStatus } from "@/actions/events";
import ConfirmDelete from "@/components/confirm-delete";
import SearchInput from "@/components/search-input";
import Pagination, { PAGE_SIZE } from "@/components/pagination";
import SortHeader from "@/components/sort-header";
import FieldFilter from "@/components/field-filter";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sortColumns: Record<string, any> = {
  name: events.name,
  date: events.date,
  location: events.location,
  status: events.status,
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; order?: string; page?: string; filter?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const sortField = params.sort || "date";
  const sortOrder = params.order || "asc";
  const page = Math.max(1, parseInt(params.page || "1"));
  const filters = Array.isArray(params.filter) ? params.filter : params.filter ? [params.filter] : [];

  const searchFilter = query
    ? or(
        ilike(events.name, `%${query}%`),
        ilike(events.location, `%${query}%`)
      )
    : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldMap: Record<string, any> = {
    "status:upcoming": eq(events.status, "upcoming"),
    "status:attended": eq(events.status, "attended"),
    "status:cancelled": eq(events.status, "cancelled"),
    "time:upcoming": asc(events.date),
    "time:past": desc(events.date),
  };

  // Build filter conditions (only status ones, not time ones)
  const statusFilters = filters
    .filter((f) => f.startsWith("status:"))
    .map((f) => fieldMap[f])
    .filter(Boolean);

  // If multiple status filters, OR them together
  const statusCondition = statusFilters.length > 1
    ? or(...statusFilters)
    : statusFilters[0] || undefined;

  const conditions = [searchFilter, statusCondition].filter(Boolean);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ value: count() }).from(events).where(whereClause);
  const total = totalResult.value;

  const sortCol = sortColumns[sortField] || events.date;
  const orderFn = sortOrder === "desc" ? desc : asc;

  const allEvents = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      location: events.location,
      status: events.status,
      companyId: events.companyId,
      companyName: companies.name,
    })
    .from(events)
    .leftJoin(companies, eq(events.companyId, companies.id))
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const sp: Record<string, string> = {};
  if (query) sp.q = query;
  if (sortField !== "date") sp.sort = sortField;
  if (sortOrder !== "asc") sp.order = sortOrder;

  const eventFilterOptions = [
    { label: "Upcoming", value: "status:upcoming" },
    { label: "Attended", value: "status:attended" },
    { label: "Cancelled", value: "status:cancelled" },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted text-sm mt-0.5">{total} event{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 items-center">
          <SearchInput placeholder="Search events..." />
          <FieldFilter options={eventFilterOptions} />
          <Link
            href="/events/new"
            className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            + Add Event
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border/60 p-16 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <p className="text-muted mb-1 font-medium">{query ? "No events match your search." : "No events yet."}</p>
          {!query && (
            <Link href="/events/new" className="text-accent hover:underline text-sm">
              Plan your first event
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card-bg rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted/80 border-b border-border/60">
                <th className="px-4 py-3 font-semibold">
                  <SortHeader label="Event" field="name" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <SortHeader label="Date" field="date" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                </th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">
                  <SortHeader label="Location" field="location" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                </th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Company</th>
                <th className="px-4 py-3 font-semibold">
                  <SortHeader label="Status" field="status" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                </th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {allEvents.map((e) => {
                const isPast = e.date < new Date().toISOString().split("T")[0];
                return (
                  <tr key={e.id} className={`border-t border-border/40 hover:bg-stone-50/60 group ${isPast ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <Link href={`/events/${e.id}/edit`} className="font-medium hover:text-accent transition-colors">
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(e.date + "T00:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">
                      <span className="truncate block max-w-[200px]">{e.location || "-"}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {e.companyId && e.companyName ? (
                        <Link href={`/companies/${e.companyId}`} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-medium hover:bg-stone-200 hover:text-accent transition-colors">
                          {e.companyName}
                        </Link>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {e.status === "upcoming" && (
                          <form action={updateEventStatus.bind(null, e.id, "attended")}>
                            <button type="submit" className="p-1.5 rounded-md hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 transition-colors" title="Mark attended">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </button>
                          </form>
                        )}
                        <Link href={`/events/${e.id}/edit`} className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </Link>
                        <ConfirmDelete action={deleteEvent.bind(null, e.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination total={total} page={page} baseUrl="/events" searchParams={sp} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    upcoming: "bg-teal-50 text-teal-700",
    attended: "bg-green-100 text-green-700",
    cancelled: "bg-stone-100 text-stone-500",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.upcoming}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
