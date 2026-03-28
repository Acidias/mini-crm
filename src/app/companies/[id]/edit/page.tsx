import Link from "next/link";
import { db } from "@/db";
import { companies, persons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateCompany, deleteCompany } from "@/actions/companies";

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

  const companyPersons = await db
    .select()
    .from(persons)
    .where(eq(persons.companyId, company.id));

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/companies" className="text-muted text-sm hover:text-foreground">
          &larr; Back to Companies
        </Link>
        <h1 className="text-2xl font-bold mt-2">{company.name}</h1>
        <p className="text-muted text-sm">
          Added {company.createdAt.toLocaleDateString("en-GB")}
          {company.industry && <> &middot; {company.industry}</>}
        </p>
      </div>

      {/* Linked persons */}
      {companyPersons.length > 0 && (
        <div className="bg-card-bg rounded-xl border border-border p-5 mb-6">
          <h2 className="font-semibold text-sm mb-3">
            Persons ({companyPersons.length})
          </h2>
          <div className="space-y-1.5">
            {companyPersons.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/persons/${p.id}/edit`}
                    className="text-accent hover:underline text-sm"
                  >
                    {p.name}
                  </Link>
                  {p.position && (
                    <span className="text-muted text-xs ml-2">{p.position}</span>
                  )}
                </div>
                {p.email && <span className="text-muted text-xs">{p.email}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        action={updateCompany.bind(null, company.id)}
        className="bg-card-bg rounded-xl border border-border p-6 space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Company Name *</label>
            <input
              name="name"
              required
              defaultValue={company.name}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Industry</label>
            <input
              name="industry"
              defaultValue={company.industry || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Website</label>
            <input
              name="website"
              defaultValue={company.website || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={company.email || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input
              name="phone"
              defaultValue={company.phone || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <input
              name="address"
              defaultValue={company.address || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={company.notes || ""}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
            >
              Update Company
            </button>
            <Link
              href="/companies"
              className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
          <form action={deleteCompany.bind(null, company.id)}>
            <button
              type="submit"
              className="text-danger text-sm hover:underline"
            >
              Delete
            </button>
          </form>
        </div>
      </form>
    </div>
  );
}
