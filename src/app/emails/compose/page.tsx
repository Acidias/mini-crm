import Link from "next/link";
import { db } from "@/db";
import { persons } from "@/db/schema";
import { sendEmail } from "@/actions/emails";

export default async function ComposeEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; personId?: string }>;
}) {
  const params = await searchParams;
  const allPersons = await db.select().from(persons);

  // Pre-fill "to" if a person was selected
  let prefillTo = params.to || "";
  if (params.personId) {
    const person = allPersons.find((p) => p.id === parseInt(params.personId!));
    if (person?.email) prefillTo = person.email;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/emails" className="text-muted text-sm hover:text-foreground">
          &larr; Back to Emails
        </Link>
        <h1 className="text-2xl font-bold mt-2">Compose Email</h1>
        <p className="text-muted text-sm mt-1">
          Sending from <span className="font-medium">info@foundry70.co.uk</span>
        </p>
      </div>

      <form action={sendEmail} className="bg-card-bg rounded-xl border border-border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">To *</label>
          <div className="flex gap-2">
            <input
              name="to"
              type="email"
              required
              defaultValue={prefillTo}
              className="border border-border rounded-lg flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="recipient@example.com"
            />
          </div>
          {allPersons.filter((p) => p.email).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allPersons
                .filter((p) => p.email)
                .map((p) => (
                  <Link
                    key={p.id}
                    href={`/emails/compose?to=${encodeURIComponent(p.email!)}`}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-muted px-2 py-1 rounded transition-colors"
                  >
                    {p.name}
                  </Link>
                ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Subject</label>
          <input
            name="subject"
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Message *</label>
          <textarea
            name="body"
            required
            rows={10}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Send Email
          </button>
          <Link
            href="/emails"
            className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
