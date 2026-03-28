import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateCompany } from "@/actions/companies";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, parseInt(id)));

  if (!company) notFound();

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Company</h1>
      <form action={updateCompany.bind(null, company.id)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            name="name"
            required
            defaultValue={company.name}
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Website</label>
          <input
            name="website"
            defaultValue={company.website || ""}
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Industry</label>
          <input
            name="industry"
            defaultValue={company.industry || ""}
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={company.notes || ""}
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
