import Link from "next/link";
import { db } from "@/db";
import { companies, persons } from "@/db/schema";
import { count, desc } from "drizzle-orm";

export default async function Home() {
  const [personCount] = await db.select({ value: count() }).from(persons);
  const [companyCount] = await db.select({ value: count() }).from(companies);

  const recentPersons = await db
    .select()
    .from(persons)
    .orderBy(desc(persons.createdAt))
    .limit(5);

  const recentCompanies = await db
    .select()
    .from(companies)
    .orderBy(desc(companies.createdAt))
    .limit(5);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border rounded p-4">
          <p className="text-gray-500 text-sm">Persons</p>
          <p className="text-3xl font-bold">{personCount.value}</p>
          <Link href="/persons/new" className="text-blue-600 text-sm">
            + Add person
          </Link>
        </div>
        <div className="border rounded p-4">
          <p className="text-gray-500 text-sm">Companies</p>
          <p className="text-3xl font-bold">{companyCount.value}</p>
          <Link href="/companies/new" className="text-blue-600 text-sm">
            + Add company
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2">Recent Persons</h2>
          {recentPersons.length === 0 ? (
            <p className="text-gray-400 text-sm">No persons yet.</p>
          ) : (
            <ul className="space-y-1">
              {recentPersons.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/persons/${p.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="font-semibold mb-2">Recent Companies</h2>
          {recentCompanies.length === 0 ? (
            <p className="text-gray-400 text-sm">No companies yet.</p>
          ) : (
            <ul className="space-y-1">
              {recentCompanies.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/companies/${c.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
