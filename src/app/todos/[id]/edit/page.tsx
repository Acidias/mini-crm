import Link from "next/link";
import { db } from "@/db";
import { todos, persons, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateTodo, deleteTodo, toggleTodo } from "@/actions/todos";

export default async function EditTodoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [todo] = await db
    .select()
    .from(todos)
    .where(eq(todos.id, parseInt(id)));

  if (!todo) notFound();

  const allPersons = await db.select().from(persons);
  const allEvents = await db.select().from(events);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/todos" className="text-muted text-sm hover:text-foreground">
          &larr; Back to To-Dos
        </Link>
        <h1 className="text-2xl font-bold mt-2">Edit To-Do</h1>
      </div>

      {/* Status card */}
      <div className="bg-card-bg rounded-xl border border-border p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide font-medium">Status</p>
          <p className={`text-lg font-semibold mt-0.5 ${todo.done ? "text-success" : "text-foreground"}`}>
            {todo.done ? "Completed" : "Pending"}
          </p>
        </div>
        <form action={toggleTodo.bind(null, todo.id, !todo.done)}>
          <button
            type="submit"
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              todo.done
                ? "border border-border text-muted hover:bg-gray-50"
                : "bg-success text-white hover:bg-green-600"
            }`}
          >
            {todo.done ? "Mark Pending" : "Mark Done"}
          </button>
        </form>
      </div>

      <form
        action={updateTodo.bind(null, todo.id)}
        className="bg-card-bg rounded-xl border border-border p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium mb-1.5">Task *</label>
          <input
            name="title"
            required
            defaultValue={todo.title}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Due Date</label>
            <input
              name="dueDate"
              type="date"
              defaultValue={todo.dueDate || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Related Person</label>
            <select
              name="personId"
              defaultValue={todo.personId?.toString() || ""}
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
            defaultValue={todo.eventId?.toString() || ""}
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
            defaultValue={todo.notes || ""}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
            >
              Update To-Do
            </button>
            <Link
              href="/todos"
              className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
          <form action={deleteTodo.bind(null, todo.id)}>
            <button type="submit" className="text-danger text-sm hover:underline">
              Delete
            </button>
          </form>
        </div>
      </form>
    </div>
  );
}
