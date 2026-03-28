import Link from "next/link";
import { db } from "@/db";
import { companies, persons } from "@/db/schema";
import { desc, eq, count, sql } from "drizzle-orm";
import { deleteCompany } from "@/actions/companies";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const allCompanies = await db
    .select({
      id: companies.id,
      name: companies.name,
      industry: companies.industry,
      website: companies.website,
      email: companies.email,
      phone: companies.phone,
      createdAt: companies.createdAt,
      personCount: count(persons.id),
    })
    .from(companies)
    .leftJoin(persons, eq(companies.id, persons.companyId))
    .groupBy(companies.id)
    .orderBy(desc(companies.createdAt));

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-muted text-sm mt-1">{allCompanies.length} total</p>
        </div>
        <Link
          href="/companies/new"
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          + Add Company
        </Link>
      </div>

      {allCompanies.length === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
          <p className="text-muted mb-3">No companies yet.</p>
          <Link href="/companies/new" className="text-accent hover:underline text-sm">
            Add your first company
          </Link>
        </div>
      ) : (
        <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-xs uppercase tracking-wide bg-gray-50">
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Industry</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Persons</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allCompanies.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <Link href={`/companies/${c.id}/edit`} className="text-accent hover:underline font-medium">
                      {c.name}
                    </Link>
                    {c.website && (
                      <p className="text-muted text-xs mt-0.5">{c.website}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted">{c.industry || "-"}</td>
                  <td className="px-5 py-3 text-muted text-xs">
                    {c.email && <p>{c.email}</p>}
                    {c.phone && <p>{c.phone}</p>}
                    {!c.email && !c.phone && "-"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-muted">{c.personCount}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <Link
                        href={`/companies/${c.id}/edit`}
                        className="text-accent text-xs hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteCompany.bind(null, c.id)}>
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
  );
}
