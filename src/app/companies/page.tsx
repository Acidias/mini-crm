import Link from "next/link";
import { db } from "@/db";
import { companies, persons } from "@/db/schema";
import { desc, eq, asc, ilike, or, count, sql, isNull, isNotNull, and, not } from "drizzle-orm";
import { deleteCompany } from "@/actions/companies";
import SearchInput from "@/components/search-input";
import Pagination, { PAGE_SIZE } from "@/components/pagination";
import SortHeader from "@/components/sort-header";
import BulkActions from "@/components/bulk-actions";
import ConfirmDelete from "@/components/confirm-delete";
import FieldFilter from "@/components/field-filter";

export const dynamic = "force-dynamic";

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
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-muted text-sm mt-1">{total} total</p>
        </div>
        <div className="flex gap-3 items-center">
          <SearchInput placeholder="Search companies..." />
          <FieldFilter options={companyFilterOptions} />
          <Link href="/companies/new" className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors">
            + Add Company
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border/60 p-12 shadow-sm text-center">
          <p className="text-muted mb-3">{query ? "No companies match your search." : "No companies yet."}</p>
          {!query && <Link href="/companies/new" className="text-accent hover:underline text-sm">Add your first company</Link>}
        </div>
      ) : (
        <BulkActions entityType="companies">
          <div className="bg-card-bg rounded-xl border border-border/60 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide bg-stone-50">
                  <th className="px-5 py-3 w-8"><input type="checkbox" data-select-all className="rounded" /></th>
                  <th className="px-5 py-3 font-medium">
                    <SortHeader label="Company" field="name" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-5 py-3 font-medium">
                    <SortHeader label="Industry" field="industry" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Persons</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allCompanies.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-stone-50/50">
                    <td className="px-5 py-3"><input type="checkbox" name="ids" value={c.id} className="rounded" /></td>
                    <td className="px-5 py-3">
                      <Link href={`/companies/${c.id}`} className="text-accent hover:underline font-medium">{c.name}</Link>
                      {c.website && <p className="text-muted text-xs mt-0.5">{c.website}</p>}
                    </td>
                    <td className="px-5 py-3 text-muted">{c.industry || "-"}</td>
                    <td className="px-5 py-3 text-muted text-xs">
                      {c.email && <p>{c.email}</p>}
                      {c.phone && <p>{c.phone}</p>}
                      {!c.email && !c.phone && "-"}
                    </td>
                    <td className="px-5 py-3 text-muted">{c.personCount}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-3 justify-end">
                        <Link href={`/companies/${c.id}/edit`} className="text-accent text-xs hover:underline">Edit</Link>
                        <ConfirmDelete action={deleteCompany.bind(null, c.id)} />
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
