import Link from "next/link";
import { db } from "@/db";
import { todos, persons, events } from "@/db/schema";
import { desc, eq, asc } from "drizzle-orm";
import { deleteTodo, toggleTodo } from "@/actions/todos";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const allTodos = await db
    .select({
      id: todos.id,
      title: todos.title,
      dueDate: todos.dueDate,
      done: todos.done,
      notes: todos.notes,
      personName: persons.name,
      personId: todos.personId,
      eventName: events.name,
      eventId: todos.eventId,
    })
    .from(todos)
    .leftJoin(persons, eq(todos.personId, persons.id))
    .leftJoin(events, eq(todos.eventId, events.id))
    .orderBy(asc(todos.done), asc(todos.dueDate), desc(todos.createdAt));

  const pending = allTodos.filter((t) => !t.done);
  const completed = allTodos.filter((t) => t.done);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">To-Do List</h1>
          <p className="text-muted text-sm mt-1">
            {pending.length} pending &middot; {completed.length} completed
          </p>
        </div>
        <Link
          href="/todos/new"
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          + Add To-Do
        </Link>
      </div>

      {/* Pending */}
      <div className="mb-8">
        {pending.length === 0 ? (
          <div className="bg-card-bg rounded-xl border border-border p-8 text-center">
            <p className="text-muted mb-3">All done! Nothing pending.</p>
            <Link href="/todos/new" className="text-accent hover:underline text-sm">
              Add a new task
            </Link>
          </div>
        ) : (
          <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
            {pending.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 hover:bg-gray-50/50"
              >
                <form action={toggleTodo.bind(null, t.id, true)}>
                  <button
                    type="submit"
                    className="w-5 h-5 rounded border-2 border-gray-300 hover:border-accent transition-colors flex-shrink-0"
                    title="Mark as done"
                  />
                </form>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/todos/${t.id}/edit`}
                      className="font-medium text-sm hover:text-accent truncate"
                    >
                      {t.title}
                    </Link>
                    {t.personName && (
                      <Link
                        href={`/persons/${t.personId}/edit`}
                        className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0"
                      >
                        {t.personName}
                      </Link>
                    )}
                    {t.eventName && (
                      <Link
                        href={`/events/${t.eventId}/edit`}
                        className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded flex-shrink-0"
                      >
                        {t.eventName}
                      </Link>
                    )}
                  </div>
                  {t.dueDate && (
                    <p className={`text-xs mt-0.5 ${
                      t.dueDate < new Date().toISOString().split("T")[0]
                        ? "text-danger font-medium"
                        : "text-muted"
                    }`}>
                      Due {new Date(t.dueDate + "T00:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 items-center flex-shrink-0">
                  <Link href={`/todos/${t.id}/edit`} className="text-accent text-xs hover:underline">
                    Edit
                  </Link>
                  <form action={deleteTodo.bind(null, t.id)}>
                    <button type="submit" className="text-danger text-xs hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
            Completed
          </h2>
          <div className="bg-card-bg rounded-xl border border-border overflow-hidden opacity-60">
            {completed.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0"
              >
                <form action={toggleTodo.bind(null, t.id, false)}>
                  <button
                    type="submit"
                    className="w-5 h-5 rounded border-2 border-success bg-success/20 flex-shrink-0 flex items-center justify-center text-success text-xs"
                    title="Mark as pending"
                  >
                    &#10003;
                  </button>
                </form>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through text-muted truncate">{t.title}</p>
                </div>
                <form action={deleteTodo.bind(null, t.id)}>
                  <button type="submit" className="text-danger text-xs hover:underline">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
