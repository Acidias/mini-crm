import Link from "next/link";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { isNull } from "drizzle-orm";
import { createEvent } from "@/actions/events";

export default async function NewEventPage() {
  const allCompanies = await db.select().from(companies).where(isNull(companies.deletedAt));
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/events" className="text-muted text-sm hover:text-foreground">
          &larr; Back to Events
        </Link>
        <h1 className="text-2xl font-bold mt-2">Add Event</h1>
      </div>
      <form action={createEvent} className="bg-card-bg rounded-xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Event Name *</label>
            <input
              name="name"
              required
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="e.g. Tech Conference 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Date *</label>
            <input
              name="date"
              type="date"
              required
              defaultValue={today}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Location</label>
            <input
              name="location"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="e.g. London, ExCeL Centre"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Related Company</label>
            <select
              name="companyId"
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
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            name="description"
            rows={3}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Save Event
          </button>
          <Link
            href="/events"
            className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
