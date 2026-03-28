import { db } from "@/db";
import { persons, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updatePerson } from "@/actions/persons";

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [person] = await db
    .select()
    .from(persons)
    .where(eq(persons.id, parseInt(id)));

  if (!person) notFound();

  const allCompanies = await db.select().from(companies);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Person</h1>
      <form action={updatePerson.bind(null, person.id)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            name="name"
            required
            defaultValue={person.name}
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={person.email || ""}
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            name="phone"
            defaultValue={person.phone || ""}
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Company</label>
          <select
            name="companyId"
            defaultValue={person.companyId?.toString() || ""}
            className="border rounded w-full px-3 py-2"
          >
            <option value="">No company</option>
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={person.notes || ""}
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Update
        </button>
      </form>
    </div>
  );
}
