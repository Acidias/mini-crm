import Link from "next/link";
import { db } from "@/db";
import { persons, companies } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { deletePerson } from "@/actions/persons";

export default async function PersonsPage() {
  const allPersons = await db
    .select({
      id: persons.id,
      name: persons.name,
      email: persons.email,
      phone: persons.phone,
      companyName: companies.name,
    })
    .from(persons)
    .leftJoin(companies, eq(persons.companyId, companies.id))
    .orderBy(desc(persons.createdAt));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Persons</h1>
        <Link
          href="/persons/new"
          className="bg-black text-white px-4 py-2 rounded text-sm"
        >
          Add Person
        </Link>
      </div>

      {allPersons.length === 0 ? (
        <p className="text-gray-400">No persons yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Company</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allPersons.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.name}</td>
                <td className="py-2 text-gray-600">{p.email || "-"}</td>
                <td className="py-2 text-gray-600">{p.phone || "-"}</td>
                <td className="py-2 text-gray-600">{p.companyName || "-"}</td>
                <td className="py-2 flex gap-2">
                  <Link
                    href={`/persons/${p.id}/edit`}
                    className="text-blue-600 text-sm"
                  >
                    Edit
                  </Link>
                  <form action={deletePerson.bind(null, p.id)}>
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
