import Link from "next/link";
import { db } from "@/db";
import { persons, companies, personGroups, groups } from "@/db/schema";
import { desc, eq, asc, ilike, or, sql, count, isNull, isNotNull, and, not, lte, gte } from "drizzle-orm";
import { deletePerson, markAsContacted } from "@/actions/persons";
import SearchInput from "@/components/search-input";
import Pagination, { PAGE_SIZE } from "@/components/pagination";
import SortHeader from "@/components/sort-header";
import BulkActions from "@/components/bulk-actions";
import ConfirmDelete from "@/components/confirm-delete";
import VerifyLinkedInButton from "@/components/verify-linkedin-button";
import FieldFilter from "@/components/field-filter";
import ReviewCards from "@/components/review-cards";
import SortPersistence from "@/components/sort-persistence";

export const dynamic = "force-dynamic";

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

const AVATAR_COLOURS = [
  "#0d9488", "#6366f1", "#d946ef", "#f59e0b", "#10b981",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
  "#06b6d4", "#84cc16", "#a855f7", "#e11d48", "#059669",
];

function nameColour(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sortColumns: Record<string, any> = {
  name: persons.name,
  email: persons.email,
  position: persons.position,
  lastContacted: persons.lastContactedAt,
  priority: persons.priority,
  created: persons.createdAt,
};

export default async function PersonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; order?: string; page?: string; filter?: string | string[]; group?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const sortField = params.sort || "name";
  const sortOrder = params.order || "asc";
  const page = Math.max(1, parseInt(params.page || "1"));
  const filters = Array.isArray(params.filter) ? params.filter : params.filter ? [params.filter] : [];
  const groupFilter = params.group ? parseInt(params.group) : null;

  const searchFilter = query
    ? or(
        ilike(persons.name, `%${query}%`),
        ilike(persons.email, `%${query}%`),
        ilike(persons.position, `%${query}%`),
        ilike(persons.phone, `%${query}%`)
      )
    : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldMap: Record<string, any> = {
    "has:email": and(isNotNull(persons.email), not(sql`${persons.email} = ''`)),
    "missing:email": or(isNull(persons.email), sql`${persons.email} = ''`),
    "has:phone": and(isNotNull(persons.phone), not(sql`${persons.phone} = ''`)),
    "missing:phone": or(isNull(persons.phone), sql`${persons.phone} = ''`),
    "has:linkedin": and(isNotNull(persons.linkedin), not(sql`${persons.linkedin} = ''`)),
    "missing:linkedin": or(isNull(persons.linkedin), sql`${persons.linkedin} = ''`),
    "has:company": isNotNull(persons.companyId),
    "missing:company": isNull(persons.companyId),
    "has:position": and(isNotNull(persons.position), not(sql`${persons.position} = ''`)),
    "missing:position": or(isNull(persons.position), sql`${persons.position} = ''`),
    "priority:high": and(isNotNull(persons.priority), gte(persons.priority, 8)),
    "priority:medium": and(isNotNull(persons.priority), gte(persons.priority, 4), lte(persons.priority, 7)),
    "priority:low": and(isNotNull(persons.priority), lte(persons.priority, 3)),
    "contacted:recent": and(isNotNull(persons.lastContactedAt), gte(persons.lastContactedAt, sql`NOW() - INTERVAL '7 days'`)),
    "contacted:stale": or(isNull(persons.lastContactedAt), lte(persons.lastContactedAt, sql`NOW() - INTERVAL '7 days'`)),
  };
  const fieldFilters = filters.map((f) => fieldMap[f]).filter(Boolean);

  const groupCondition = groupFilter
    ? sql`${persons.id} IN (SELECT person_id FROM person_groups WHERE group_id = ${groupFilter})`
    : undefined;

  let activeGroupName: string | null = null;
  if (groupFilter) {
    const [g] = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, groupFilter));
    activeGroupName = g?.name || null;
  }

  const conditions = [isNull(persons.deletedAt), searchFilter, groupCondition, ...fieldFilters].filter(Boolean);
  const whereClause = and(...conditions);

  const [totalResult] = await db
    .select({ value: count() })
    .from(persons)
    .where(whereClause);
  const total = totalResult.value;

  const sortCol = sortColumns[sortField] || persons.name;
  const orderFn = sortOrder === "desc" ? desc : asc;

  const allPersons = await db
    .select({
      id: persons.id,
      name: persons.name,
      email: persons.email,
      phone: persons.phone,
      position: persons.position,
      linkedin: persons.linkedin,
      lastContactedAt: persons.lastContactedAt,
      priority: persons.priority,
      companyId: persons.companyId,
      companyName: companies.name,
    })
    .from(persons)
    .leftJoin(companies, eq(persons.companyId, companies.id))
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const sp: Record<string, string> = {};
  if (query) sp.q = query;
  if (sortField !== "name") sp.sort = sortField;
  if (sortOrder !== "asc") sp.order = sortOrder;
  if (groupFilter) sp.group = groupFilter.toString();

  const personFilterOptions = [
    { label: "High priority (8-10)", value: "priority:high" },
    { label: "Medium priority (4-7)", value: "priority:medium" },
    { label: "Low priority (1-3)", value: "priority:low" },
    { label: "Contacted recently", value: "contacted:recent" },
    { label: "Needs follow-up", value: "contacted:stale" },
    { label: "Has email", value: "has:email" },
    { label: "Missing email", value: "missing:email" },
    { label: "Has phone", value: "has:phone" },
    { label: "Missing phone", value: "missing:phone" },
    { label: "Has LinkedIn", value: "has:linkedin" },
    { label: "Missing LinkedIn", value: "missing:linkedin" },
    { label: "Has company", value: "has:company" },
    { label: "No company", value: "missing:company" },
    { label: "Has position", value: "has:position" },
    { label: "Missing position", value: "missing:position" },
  ];

  return (
    <div>
      <SortPersistence pageKey="persons" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Persons</h1>
          <p className="text-muted text-sm mt-0.5">{total} contact{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <SearchInput placeholder="Search persons..." />
          <FieldFilter options={personFilterOptions} />
          <VerifyLinkedInButton />
          {allPersons.length > 0 && (
            <ReviewCards
              personIds={allPersons.map((p) => p.id)}
              trigger={
                <button className="border border-border/60 bg-white px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-stone-50 hover:text-foreground hover:border-stone-300 transition-colors">
                  Review
                </button>
              }
            />
          )}
          <Link
            href="/persons/new"
            className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            + Add Person
          </Link>
        </div>
      </div>

      {activeGroupName && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-teal-50 border border-teal-200/60 rounded-xl text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className="text-teal-700 font-medium">Group: {activeGroupName}</span>
          <Link href="/persons" className="text-teal-600 hover:text-teal-800 ml-auto text-xs font-medium">
            Clear
          </Link>
        </div>
      )}

      {total === 0 ? (
        <div className="bg-card-bg rounded-2xl border border-border/60 p-16 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600/70"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <p className="text-foreground font-medium mb-1">{query ? "No persons match your search." : "No persons yet."}</p>
          <p className="text-muted text-sm mb-4">{query ? "Try adjusting your search terms or filters." : "Start building your contact network."}</p>
          {!query && (
            <Link href="/persons/new" className="inline-flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Add your first contact
            </Link>
          )}
        </div>
      ) : (
        <BulkActions entityType="persons">
          <div className="bg-card-bg rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted/70 border-b border-border/50 bg-stone-50/80">
                  <th className="pl-4 pr-1 py-3 w-10">
                    <input type="checkbox" data-select-all className="rounded" />
                  </th>
                  <th className="pl-1 pr-4 py-3 font-semibold">
                    <SortHeader label="Name" field="name" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell w-24">
                    <SortHeader label="Priority" field="priority" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Company</th>
                  <th className="px-4 py-3 font-semibold hidden xl:table-cell">
                    <SortHeader label="Email" field="email" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell w-32">
                    <SortHeader label="Last Contact" field="lastContacted" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {allPersons.map((p) => {
                  const isStale =
                    !p.lastContactedAt ||
                    Date.now() - p.lastContactedAt.getTime() > 7 * 24 * 60 * 60 * 1000;
                  const initials = p.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={p.id} className="border-t border-border/30 hover:bg-stone-50/70 group transition-colors">
                      <td className="pl-4 pr-1 py-3">
                        <input type="checkbox" name="ids" value={p.id} className="rounded" />
                      </td>
                      {/* Name cell - stacks position + company on mobile */}
                      <td className="pl-1 pr-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: nameColour(p.name) }}
                          >
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/persons/${p.id}`} className="group/name flex items-center gap-1.5">
                              <span className="font-semibold text-foreground group-hover/name:text-accent transition-colors truncate">
                                {p.name}
                              </span>
                              {p.linkedin && (
                                <svg className="flex-shrink-0 text-[#0A66C2] opacity-40" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-label="Has LinkedIn"><path d="M20.47 2H3.53A1.45 1.45 0 0 0 2 3.47v17.06A1.45 1.45 0 0 0 3.47 22h17.06A1.45 1.45 0 0 0 22 20.53V3.47A1.45 1.45 0 0 0 20.47 2ZM8.09 18.74h-3v-9h3v9ZM6.59 8.48a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12Zm12.32 10.26h-3v-4.83c0-1.21-.43-2-1.52-2A1.65 1.65 0 0 0 12.85 13a2 2 0 0 0-.1.73v5h-3v-9h3v1.2a3 3 0 0 1 2.71-1.5c2 0 3.45 1.29 3.45 4.06v5.25Z"/></svg>
                              )}
                            </Link>
                            {/* Subtitle: position on all screens, company on mobile only */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.position && (
                                <span className="text-xs text-muted truncate max-w-[180px]">{p.position}</span>
                              )}
                              {/* Show company inline on mobile (hidden on lg where it has its own column) */}
                              {p.companyName && (
                                <span className="text-xs text-stone-400 lg:hidden">
                                  {p.position && <span className="mr-1">-</span>}
                                  {p.companyName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <PriorityBadge priority={p.priority} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {p.companyId && p.companyName ? (
                          <Link href={`/companies/${p.companyId}`} className="inline-flex items-center gap-1.5 text-xs bg-stone-100/80 text-stone-600 pl-1.5 pr-2.5 py-1 rounded-md font-medium hover:bg-stone-200 hover:text-accent transition-colors">
                            <span className="w-4 h-4 rounded bg-stone-300/60 flex items-center justify-center text-[9px] font-bold text-stone-500">{p.companyName[0]}</span>
                            {p.companyName}
                          </Link>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-muted text-xs truncate block max-w-[200px]">{p.email || <span className="text-stone-300">-</span>}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isStale ? "bg-amber-400" : "bg-emerald-400"}`} />
                          <span className="text-muted">{timeAgo(p.lastContactedAt)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <form action={markAsContacted.bind(null, p.id)}>
                            <button type="submit" className="p-1.5 rounded-lg hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 transition-colors" title="Mark contacted">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </button>
                          </form>
                          <Link href={`/persons/${p.id}/edit`} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </Link>
                          <ConfirmDelete
                            action={deletePerson.bind(null, p.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500 transition-colors"
                            label={"\u00D7"}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </BulkActions>
      )}

      <Pagination total={total} page={page} baseUrl="/persons" searchParams={sp} />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: number | null }) {
  if (priority === null) return <span className="text-stone-300">-</span>;
  if (priority >= 8) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        High
      </span>
    );
  }
  if (priority >= 4) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Med
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
      Low
    </span>
  );
}
