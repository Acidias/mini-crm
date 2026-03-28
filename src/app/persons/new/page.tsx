import { db } from "@/db";
import { companies } from "@/db/schema";
import { createPerson } from "@/actions/persons";

export default async function NewPersonPage() {
  const allCompanies = await db.select().from(companies);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add Person</h1>
      <form action={createPerson} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            name="name"
            required
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            name="email"
            type="email"
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            name="phone"
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Company</label>
          <select name="companyId" className="border rounded w-full px-3 py-2">
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
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </form>
    </div>
  );
}
