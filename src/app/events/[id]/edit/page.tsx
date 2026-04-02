import Link from "next/link";
import { Refreshable } from "@/components/refreshable";
import { db } from "@/db";
import { events, companies } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateEvent, deleteEvent, updateEventStatus } from "@/actions/events";
import ConfirmDelete from "@/components/confirm-delete";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, parseInt(id)));

  if (!event) notFound();

  const allCompanies = await db.select().from(companies).where(isNull(companies.deletedAt));
  const linkedCompany = event.companyId
    ? allCompanies.find((c) => c.id === event.companyId)
    : null;

  const isPast = event.date < new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/events" className="text-muted text-sm hover:text-foreground">
          &larr; Back to Events
        </Link>
        <h1 className="text-2xl font-bold mt-2">{event.name}</h1>
        <p className="text-muted text-sm">
          {new Date(event.date + "T00:00:00").toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {event.location && <> &middot; {event.location}</>}
          {linkedCompany && (
            <>
              {" "}&middot;{" "}
              <Link href={`/companies/${linkedCompany.id}/edit`} className="text-accent hover:underline">
                {linkedCompany.name}
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Status card */}
      <div className="bg-card-bg rounded-xl border border-border p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide font-medium">Status</p>
          <p className="text-lg font-semibold mt-0.5 capitalize">{event.status}</p>
        </div>
        <div className="flex gap-2">
          {event.status !== "attended" && (
            <form action={updateEventStatus.bind(null, event.id, "attended")}>
              <button
                type="submit"
                className="bg-success text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors"
              >
                Mark Attended
              </button>
            </form>
          )}
          {event.status !== "cancelled" && (
            <form action={updateEventStatus.bind(null, event.id, "cancelled")}>
              <button
                type="submit"
                className="border border-border px-4 py-2 rounded-lg text-sm text-muted hover:bg-stone-50 transition-colors"
              >
                Cancel Event
              </button>
            </form>
          )}
          {event.status !== "upcoming" && (
            <form action={updateEventStatus.bind(null, event.id, "upcoming")}>
              <button
                type="submit"
                className="border border-border px-4 py-2 rounded-lg text-sm text-accent hover:bg-blue-50 transition-colors"
              >
                Mark Upcoming
              </button>
            </form>
          )}
        </div>
      </div>

      <Refreshable>
      <form
        action={updateEvent.bind(null, event.id)}
        className="bg-card-bg rounded-xl border border-border p-6 space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Event Name *</label>
            <input
              name="name"
              required
              defaultValue={event.name}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Date *</label>
            <input
              name="date"
              type="date"
              required
              defaultValue={event.date}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Location</label>
            <input
              name="location"
              defaultValue={event.location || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Related Company</label>
            <select
              name="companyId"
              defaultValue={event.companyId?.toString() || ""}
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
            defaultValue={event.description || ""}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Update Event
          </button>
          <Link
            href="/events"
            className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-stone-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
      </Refreshable>
      <div className="flex justify-end mt-3">
        <ConfirmDelete action={deleteEvent.bind(null, event.id)} className="text-danger text-sm hover:underline" />
      </div>
    </div>
  );
}
