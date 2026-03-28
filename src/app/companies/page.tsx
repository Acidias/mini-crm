import Link from "next/link";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { desc } from "drizzle-orm";
import { deleteCompany } from "@/actions/companies";

export default async function CompaniesPage() {
  const allCompanies = await db
    .select()
    .from(companies)
    .orderBy(desc(companies.createdAt));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Link
          href="/companies/new"
          className="bg-black text-white px-4 py-2 rounded text-sm"
        >
          Add Company
        </Link>
      </div>

      {allCompanies.length === 0 ? (
        <p className="text-gray-400">No companies yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Name</th>
              <th className="py-2">Industry</th>
              <th className="py-2">Website</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allCompanies.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{c.name}</td>
                <td className="py-2 text-gray-600">{c.industry || "-"}</td>
                <td className="py-2 text-gray-600">{c.website || "-"}</td>
                <td className="py-2 flex gap-2">
                  <Link
                    href={`/companies/${c.id}/edit`}
                    className="text-blue-600 text-sm"
                  >
                    Edit
                  </Link>
                  <form action={deleteCompany.bind(null, c.id)}>
                    <button
                      type="submit"
                      className="text-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
