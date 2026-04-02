import Link from "next/link";
import { db } from "@/db";
import { persons, companies } from "@/db/schema";
import { desc, eq, asc, ilike, or, sql, count, isNull, and } from "drizzle-orm";
import { deletePerson, markAsContacted } from "@/actions/persons";
import SearchInput from "@/components/search-input";
import Pagination, { PAGE_SIZE } from "@/components/pagination";
import SortHeader from "@/components/sort-header";
import BulkActions from "@/components/bulk-actions";
import ConfirmDelete from "@/components/confirm-delete";
import VerifyLinkedInButton from "@/components/verify-linkedin-button";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sortColumns: Record<string, any> = {
  name: persons.name,
  email: persons.email,
  position: persons.position,
  lastContacted: persons.lastContactedAt,
};

export default async function PersonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; order?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const sortField = params.sort || "name";
  const sortOrder = params.order || "asc";
  const page = Math.max(1, parseInt(params.page || "1"));

  const searchFilter = query
    ? or(
        ilike(persons.name, `%${query}%`),
        ilike(persons.email, `%${query}%`),
        ilike(persons.position, `%${query}%`),
        ilike(persons.phone, `%${query}%`)
      )
    : undefined;
  const whereClause = searchFilter
    ? and(isNull(persons.deletedAt), searchFilter)
    : isNull(persons.deletedAt);

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Persons</h1>
          <p className="text-muted text-sm mt-0.5">{total} contact{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 items-center">
          <SearchInput placeholder="Search persons..." />
          <VerifyLinkedInButton />
          <Link
            href="/persons/new"
            className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            + Add Person
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border/60 p-16 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <p className="text-muted mb-1 font-medium">{query ? "No persons match your search." : "No persons yet."}</p>
          {!query && (
            <Link href="/persons/new" className="text-accent hover:underline text-sm">
              Add your first contact
            </Link>
          )}
        </div>
      ) : (
        <BulkActions entityType="persons">
          <div className="bg-card-bg rounded-xl border border-border/60 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted/80 border-b border-border/60">
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" data-select-all className="rounded" />
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    <SortHeader label="Name" field="name" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden xl:table-cell">
                    <SortHeader label="Position" field="position" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">
                    <SortHeader label="Email" field="email" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    <SortHeader label="Last Contact" field="lastContacted" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {allPersons.map((p) => {
                  const isStale =
                    !p.lastContactedAt ||
                    Date.now() - p.lastContactedAt.getTime() > 7 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={p.id} className="border-t border-border/40 hover:bg-stone-50/60 group">
                      <td className="pl-4 pr-2 py-3">
                        <input type="checkbox" name="ids" value={p.id} className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/persons/${p.id}`} className="group/name">
                          <span className="font-medium text-foreground group-hover/name:text-accent transition-colors">
                            {p.name}
                          </span>
                          {p.linkedin && (
                            <svg className="inline-block ml-1.5 text-[#0A66C2] opacity-50" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" title="Has LinkedIn"><path d="M20.47 2H3.53A1.45 1.45 0 0 0 2 3.47v17.06A1.45 1.45 0 0 0 3.47 22h17.06A1.45 1.45 0 0 0 22 20.53V3.47A1.45 1.45 0 0 0 20.47 2ZM8.09 18.74h-3v-9h3v9ZM6.59 8.48a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12Zm12.32 10.26h-3v-4.83c0-1.21-.43-2-1.52-2A1.65 1.65 0 0 0 12.85 13a2 2 0 0 0-.1.73v5h-3v-9h3v1.2a3 3 0 0 1 2.71-1.5c2 0 3.45 1.29 3.45 4.06v5.25Z"/></svg>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted hidden xl:table-cell">
                        <span className="truncate block max-w-[160px]">{p.position || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.companyName ? (
                          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-medium">{p.companyName}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden lg:table-cell">
                        {p.email || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {isStale ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="text-muted">{timeAgo(p.lastContactedAt)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-muted">{timeAgo(p.lastContactedAt)}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <form action={markAsContacted.bind(null, p.id)}>
                            <button type="submit" className="p-1.5 rounded-md hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 transition-colors" title="Mark contacted">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </button>
                          </form>
                          <Link href={`/persons/${p.id}/edit`} className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </Link>
                          <ConfirmDelete action={deletePerson.bind(null, p.id)} />
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
