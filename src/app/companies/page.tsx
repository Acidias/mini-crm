import Link from "next/link";
import { db } from "@/db";
import { companies, persons } from "@/db/schema";
import { desc, eq, asc, ilike, or, count, sql, isNull, isNotNull, and, not, lte, gte } from "drizzle-orm";
import { deleteCompany } from "@/actions/companies";
import SearchInput from "@/components/search-input";
import Pagination, { PAGE_SIZE } from "@/components/pagination";
import SortHeader from "@/components/sort-header";
import BulkActions from "@/components/bulk-actions";
import ConfirmDelete from "@/components/confirm-delete";
import FieldFilter from "@/components/field-filter";
import SortPersistence from "@/components/sort-persistence";

export const dynamic = "force-dynamic";

const COMPANY_COLOURS = [
  "#6366f1", "#0d9488", "#d946ef", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#10b981", "#f97316", "#06b6d4",
  "#84cc16", "#a855f7", "#e11d48", "#059669", "#14b8a6",
];

function companyColour(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COMPANY_COLOURS[Math.abs(hash) % COMPANY_COLOURS.length];
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; order?: string; page?: string; filter?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const sortField = params.sort || "name";
  const sortOrder = params.order || "asc";
  const page = Math.max(1, parseInt(params.page || "1"));
  const filters = Array.isArray(params.filter) ? params.filter : params.filter ? [params.filter] : [];

  const searchFilter = query
    ? or(
        ilike(companies.name, `%${query}%`),
        ilike(companies.industry, `%${query}%`),
        ilike(companies.email, `%${query}%`),
        ilike(companies.website, `%${query}%`)
      )
    : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldMap: Record<string, any> = {
    "has:email": and(isNotNull(companies.email), not(sql`${companies.email} = ''`)),
    "missing:email": or(isNull(companies.email), sql`${companies.email} = ''`),
    "has:phone": and(isNotNull(companies.phone), not(sql`${companies.phone} = ''`)),
    "missing:phone": or(isNull(companies.phone), sql`${companies.phone} = ''`),
    "has:website": and(isNotNull(companies.website), not(sql`${companies.website} = ''`)),
    "missing:website": or(isNull(companies.website), sql`${companies.website} = ''`),
    "has:industry": and(isNotNull(companies.industry), not(sql`${companies.industry} = ''`)),
    "missing:industry": or(isNull(companies.industry), sql`${companies.industry} = ''`),
    "has:address": and(isNotNull(companies.address), not(sql`${companies.address} = ''`)),
    "missing:address": or(isNull(companies.address), sql`${companies.address} = ''`),
    "priority:high": and(isNotNull(companies.priority), gte(companies.priority, 8)),
    "priority:medium": and(isNotNull(companies.priority), gte(companies.priority, 4), lte(companies.priority, 7)),
    "priority:low": and(isNotNull(companies.priority), lte(companies.priority, 3)),
  };
  const fieldFilters = filters.map((f) => fieldMap[f]).filter(Boolean);

  const conditions = [isNull(companies.deletedAt), searchFilter, ...fieldFilters].filter(Boolean);
  const whereClause = and(...conditions);

  const [totalResult] = await db.select({ value: count() }).from(companies).where(whereClause);
  const total = totalResult.value;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortColumns: Record<string, any> = {
    name: companies.name,
    industry: companies.industry,
    email: companies.email,
    priority: companies.priority,
    created: companies.createdAt,
  };
  const sortCol = sortColumns[sortField] || companies.name;
  const orderFn = sortOrder === "desc" ? desc : asc;

  const allCompanies = await db
    .select({
      id: companies.id,
      name: companies.name,
      industry: companies.industry,
      website: companies.website,
      email: companies.email,
      phone: companies.phone,
      priority: companies.priority,
      personCount: count(persons.id),
    })
    .from(companies)
    .leftJoin(persons, eq(companies.id, persons.companyId))
    .where(whereClause)
    .groupBy(companies.id)
    .orderBy(orderFn(sortCol))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const sp: Record<string, string> = {};
  if (query) sp.q = query;
  if (sortField !== "name") sp.sort = sortField;
  if (sortOrder !== "asc") sp.order = sortOrder;

  const companyFilterOptions = [
    { label: "High priority (8-10)", value: "priority:high" },
    { label: "Medium priority (4-7)", value: "priority:medium" },
    { label: "Low priority (1-3)", value: "priority:low" },
    { label: "Has email", value: "has:email" },
    { label: "Missing email", value: "missing:email" },
    { label: "Has phone", value: "has:phone" },
    { label: "Missing phone", value: "missing:phone" },
    { label: "Has website", value: "has:website" },
    { label: "Missing website", value: "missing:website" },
    { label: "Has industry", value: "has:industry" },
    { label: "Missing industry", value: "missing:industry" },
    { label: "Has address", value: "has:address" },
    { label: "Missing address", value: "missing:address" },
  ];

  return (
    <div>
      <SortPersistence pageKey="companies" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted text-sm mt-0.5">{total} compan{total !== 1 ? "ies" : "y"}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <SearchInput placeholder="Search companies..." />
          <FieldFilter options={companyFilterOptions} />
          <Link href="/companies/new" className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm">
            + Add Company
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-card-bg rounded-2xl border border-border/60 p-16 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500/70"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
          </div>
          <p className="text-foreground font-medium mb-1">{query ? "No companies match your search." : "No companies yet."}</p>
          <p className="text-muted text-sm mb-4">{query ? "Try adjusting your search terms or filters." : "Start tracking the organisations you work with."}</p>
          {!query && (
            <Link href="/companies/new" className="inline-flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Add your first company
            </Link>
          )}
        </div>
      ) : (
        <BulkActions entityType="companies">
          <div className="bg-card-bg rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted/70 border-b border-border/50 bg-stone-50/80">
                  <th className="pl-4 pr-1 py-3 w-10">
                    <input type="checkbox" data-select-all className="rounded" />
                  </th>
                  <th className="pl-1 pr-4 py-3 font-semibold">
                    <SortHeader label="Company" field="name" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell w-24">
                    <SortHeader label="Priority" field="priority" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">
                    <SortHeader label="Industry" field="industry" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden xl:table-cell">
                    <SortHeader label="Email" field="email" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell w-24 text-center">Persons</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {allCompanies.map((c) => (
                  <tr key={c.id} className="border-t border-border/30 hover:bg-stone-50/70 group transition-colors">
                    <td className="pl-4 pr-1 py-3">
                      <input type="checkbox" name="ids" value={c.id} className="rounded" />
                    </td>
                    {/* Company cell - avatar + name + subtitle info */}
                    <td className="pl-1 pr-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: companyColour(c.name) }}
                        >
                          {c.name[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/companies/${c.id}`} className="group/name">
                            <span className="font-semibold text-foreground group-hover/name:text-accent transition-colors truncate block">
                              {c.name}
                            </span>
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {c.website && (
                              <span className="text-xs text-muted truncate max-w-[180px]">{c.website.replace(/^https?:\/\//, "")}</span>
                            )}
                            {/* Show industry inline on mobile (hidden on lg where it has its own column) */}
                            {c.industry && (
                              <span className="text-xs text-stone-400 lg:hidden">
                                {c.website && <span className="mr-1">-</span>}
                                {c.industry}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {c.industry ? (
                        <span className="text-xs text-muted bg-stone-50 px-2 py-0.5 rounded-md">{c.industry}</span>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-muted text-xs truncate block max-w-[200px]">
                        {c.email || <span className="text-stone-300">-</span>}
                      </span>
                      {c.phone && <span className="text-muted text-xs block mt-0.5">{c.phone}</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-center">
                      {c.personCount > 0 ? (
                        <Link href={`/companies/${c.id}`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                          <span className="font-medium">{c.personCount}</span>
                        </Link>
                      ) : (
                        <span className="text-stone-300 text-xs">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/companies/${c.id}/edit`} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </Link>
                        <ConfirmDelete
                          action={deleteCompany.bind(null, c.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500 transition-colors"
                          label={"\u00D7"}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BulkActions>
      )}

      <Pagination total={total} page={page} baseUrl="/companies" searchParams={sp} />
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
