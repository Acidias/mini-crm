import Link from "next/link";
import { db } from "@/db";
import { persons, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updatePerson, deletePerson, markAsContacted } from "@/actions/persons";

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

  const linkedCompany = person.companyId
    ? allCompanies.find((c) => c.id === person.companyId)
    : null;

  const isStale =
    !person.lastContactedAt ||
    Date.now() - person.lastContactedAt.getTime() > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/persons" className="text-muted text-sm hover:text-foreground">
          &larr; Back to Persons
        </Link>
        <h1 className="text-2xl font-bold mt-2">{person.name}</h1>
        <p className="text-muted text-sm">
          {person.position && <>{person.position}</>}
          {person.position && linkedCompany && <> at </>}
          {linkedCompany && (
            <Link href={`/companies/${linkedCompany.id}/edit`} className="text-accent hover:underline">
              {linkedCompany.name}
            </Link>
          )}
          {!person.position && !linkedCompany && (
            <>Added {person.createdAt.toLocaleDateString("en-GB")}</>
          )}
        </p>
      </div>

      {/* Contact status card */}
      <div className="bg-card-bg rounded-xl border border-border p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide font-medium">Last Contacted</p>
          <p className={`text-lg font-semibold mt-0.5 ${isStale ? "text-danger" : "text-success"}`}>
            {timeAgo(person.lastContactedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {person.email && (
            <Link
              href={`/emails/compose?to=${encodeURIComponent(person.email)}`}
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
            >
              Send Email
            </Link>
          )}
          <form action={markAsContacted.bind(null, person.id)}>
            <button
              type="submit"
              className="bg-success text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors"
            >
              Mark as Contacted
            </button>
          </form>
        </div>
      </div>

      <form
        action={updatePerson.bind(null, person.id)}
        className="bg-card-bg rounded-xl border border-border p-6 space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Full Name *</label>
            <input
              name="name"
              required
              defaultValue={person.name}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Position / Role</label>
            <input
              name="position"
              defaultValue={person.position || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Company</label>
            <select
              name="companyId"
              defaultValue={person.companyId?.toString() || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
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
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={person.email || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input
              name="phone"
              defaultValue={person.phone || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={person.notes || ""}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
            >
              Update Person
            </button>
            <Link
              href="/persons"
              className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
          <form action={deletePerson.bind(null, person.id)}>
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
