import Link from "next/link";
import { db } from "@/db";
import { persons, events } from "@/db/schema";
import { createTodo } from "@/actions/todos";

export default async function NewTodoPage() {
  const allPersons = await db.select().from(persons);
  const allEvents = await db.select().from(events);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/todos" className="text-muted text-sm hover:text-foreground">
          &larr; Back to To-Dos
        </Link>
        <h1 className="text-2xl font-bold mt-2">Add To-Do</h1>
      </div>
      <form action={createTodo} className="bg-card-bg rounded-xl border border-border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Task *</label>
          <input
            name="title"
            required
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            placeholder="e.g. Contact John about the proposal"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Due Date</label>
            <input
              name="dueDate"
              type="date"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Related Person</label>
            <select
              name="personId"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              <option value="">None</option>
              {allPersons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Related Event</label>
          <select
            name="eventId"
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          >
            <option value="">None</option>
            {allEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Notes</label>
          <textarea
            name="notes"
            rows={2}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Save To-Do
          </button>
          <Link
            href="/todos"
            className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
