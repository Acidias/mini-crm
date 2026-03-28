import Link from "next/link";
import { db } from "@/db";
import { persons, companies } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { deletePerson, markAsContacted } from "@/actions/persons";

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

export default async function PersonsPage() {
  const allPersons = await db
    .select({
      id: persons.id,
      name: persons.name,
      email: persons.email,
      phone: persons.phone,
      position: persons.position,
      lastContactedAt: persons.lastContactedAt,
      companyName: companies.name,
    })
    .from(persons)
    .leftJoin(companies, eq(persons.companyId, companies.id))
    .orderBy(desc(persons.createdAt));

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Persons</h1>
          <p className="text-muted text-sm mt-1">{allPersons.length} total</p>
        </div>
        <Link
          href="/persons/new"
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          + Add Person
        </Link>
      </div>

      {allPersons.length === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
          <p className="text-muted mb-3">No persons yet.</p>
          <Link href="/persons/new" className="text-accent hover:underline text-sm">
            Add your first person
          </Link>
        </div>
      ) : (
        <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-xs uppercase tracking-wide bg-gray-50">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Position</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Last Contacted</th>
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
                      <Link
                        href={`/persons/${p.id}/edit`}
                        className="text-accent hover:underline font-medium"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">{p.position || "-"}</td>
                    <td className="px-5 py-3 text-muted">{p.companyName || "-"}</td>
                    <td className="px-5 py-3 text-muted text-xs">
                      {p.email && <p>{p.email}</p>}
                      {p.phone && <p>{p.phone}</p>}
                      {!p.email && !p.phone && "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={isStale ? "text-danger font-medium" : "text-success"}>
                        {timeAgo(p.lastContactedAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-3 justify-end items-center">
                        <form action={markAsContacted.bind(null, p.id)}>
                          <button
                            type="submit"
                            className="text-success text-xs hover:underline"
                          >
                            Contacted
                          </button>
                        </form>
                        <Link
                          href={`/persons/${p.id}/edit`}
                          className="text-accent text-xs hover:underline"
                        >
                          Edit
                        </Link>
                        <form action={deletePerson.bind(null, p.id)}>
                          <button type="submit" className="text-danger text-xs hover:underline">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
