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
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Persons</h1>
          <p className="text-muted text-sm mt-1">{total} total</p>
        </div>
        <div className="flex gap-3 items-center">
          <SearchInput placeholder="Search persons..." />
          <Link
            href="/persons/new"
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            + Add Person
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
          <p className="text-muted mb-3">{query ? "No persons match your search." : "No persons yet."}</p>
          {!query && (
            <Link href="/persons/new" className="text-accent hover:underline text-sm">
              Add your first person
            </Link>
          )}
        </div>
      ) : (
        <BulkActions entityType="persons">
          <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide bg-gray-50">
                  <th className="px-5 py-3 w-8">
                    <input type="checkbox" data-select-all className="rounded" />
                  </th>
                  <th className="px-5 py-3 font-medium">
                    <SortHeader label="Name" field="name" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-5 py-3 font-medium">
                    <SortHeader label="Position" field="position" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">
                    <SortHeader label="Email" field="email" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-5 py-3 font-medium">LinkedIn</th>
                  <th className="px-5 py-3 font-medium">
                    <SortHeader label="Last Contacted" field="lastContacted" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allPersons.map((p) => {
                  const isStale =
                    !p.lastContactedAt ||
                    Date.now() - p.lastContactedAt.getTime() > 7 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <input type="checkbox" name="ids" value={p.id} className="rounded" />
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/persons/${p.id}`} className="text-accent hover:underline font-medium">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted">{p.position || "-"}</td>
                      <td className="px-5 py-3 text-muted">{p.companyName || "-"}</td>
                      <td className="px-5 py-3 text-muted">{p.email || "-"}</td>
                      <td className="px-5 py-3">
                        {p.linkedin ? (
                          <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline">
                            {p.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "").slice(0, 20)}
                          </a>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={isStale ? "text-danger font-medium" : "text-success"}>
                          {timeAgo(p.lastContactedAt)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-3 justify-end items-center">
                          <form action={markAsContacted.bind(null, p.id)}>
                            <button type="submit" className="text-success text-xs hover:underline">Contacted</button>
                          </form>
                          <Link href={`/persons/${p.id}/edit`} className="text-accent text-xs hover:underline">Edit</Link>
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
