import Link from "next/link";
import { db } from "@/db";
import { todos, persons, events } from "@/db/schema";
import { desc, eq, asc, ilike, count, and, isNull, isNotNull, lt, sql, or } from "drizzle-orm";
import { deleteTodo, toggleTodo } from "@/actions/todos";
import SearchInput from "@/components/search-input";
import Pagination, { PAGE_SIZE } from "@/components/pagination";
import SortHeader from "@/components/sort-header";
import BulkActions from "@/components/bulk-actions";
import ConfirmDelete from "@/components/confirm-delete";
import FieldFilter from "@/components/field-filter";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sortColumns: Record<string, any> = {
  title: todos.title,
  dueDate: todos.dueDate,
  created: todos.createdAt,
  done: todos.done,
};

export default async function TodosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; order?: string; page?: string; filter?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const sortField = params.sort || "";
  const sortOrder = params.order || "asc";
  const page = Math.max(1, parseInt(params.page || "1"));
  const filters = Array.isArray(params.filter) ? params.filter : params.filter ? [params.filter] : [];

  const searchFilter = query
    ? ilike(todos.title, `%${query}%`)
    : undefined;

  const today = new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldMap: Record<string, any> = {
    "status:pending": eq(todos.done, false),
    "status:done": eq(todos.done, true),
    "overdue": and(eq(todos.done, false), isNotNull(todos.dueDate), lt(todos.dueDate, today)),
    "has:person": isNotNull(todos.personId),
    "missing:person": isNull(todos.personId),
    "has:event": isNotNull(todos.eventId),
    "missing:event": isNull(todos.eventId),
    "has:dueDate": isNotNull(todos.dueDate),
    "missing:dueDate": isNull(todos.dueDate),
  };
  const fieldFilters = filters.map((f) => fieldMap[f]).filter(Boolean);

  const conditions = [searchFilter, ...fieldFilters].filter(Boolean);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ value: count() }).from(todos).where(whereClause);
  const total = totalResult.value;

  // Default sort: done ASC, dueDate ASC, createdAt DESC
  const hasCustomSort = sortField && sortColumns[sortField];
  const sortCol = hasCustomSort ? sortColumns[sortField] : null;
  const orderFn = sortOrder === "desc" ? desc : asc;

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
      createdAt: todos.createdAt,
    })
    .from(todos)
    .leftJoin(persons, eq(todos.personId, persons.id))
    .leftJoin(events, eq(todos.eventId, events.id))
    .where(whereClause)
    .orderBy(
      ...(sortCol
        ? [orderFn(sortCol)]
        : [asc(todos.done), asc(todos.dueDate), desc(todos.createdAt)])
    )
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const sp: Record<string, string> = {};
  if (query) sp.q = query;
  if (sortField) sp.sort = sortField;
  if (sortOrder !== "asc") sp.order = sortOrder;

  const todoFilterOptions = [
    { label: "Pending", value: "status:pending" },
    { label: "Completed", value: "status:done" },
    { label: "Overdue", value: "overdue" },
    { label: "Has due date", value: "has:dueDate" },
    { label: "No due date", value: "missing:dueDate" },
    { label: "Linked to person", value: "has:person" },
    { label: "No person", value: "missing:person" },
    { label: "Linked to event", value: "has:event" },
    { label: "No event", value: "missing:event" },
  ];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">To-Do List</h1>
          <p className="text-muted text-sm mt-0.5">{total} task{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 items-center">
          <SearchInput placeholder="Search todos..." />
          <FieldFilter options={todoFilterOptions} />
          <Link href="/todos/new" className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm">
            + Add To-Do
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border/60 p-16 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <p className="text-muted mb-1 font-medium">{query ? "No todos match your search." : "All done! Nothing pending."}</p>
          {!query && <Link href="/todos/new" className="text-accent hover:underline text-sm">Add a new task</Link>}
        </div>
      ) : (
        <BulkActions entityType="todos">
          <div className="bg-card-bg rounded-xl border border-border/60 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted/80 border-b border-border/60">
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" data-select-all className="rounded" />
                  </th>
                  <th className="px-2 py-3 w-10"></th>
                  <th className="px-4 py-3 font-semibold">
                    <SortHeader label="Title" field="title" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">
                    <SortHeader label="Due Date" field="dueDate" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Person</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Event</th>
                  <th className="px-4 py-3 font-semibold">
                    <SortHeader label="Status" field="done" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                  </th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {allTodos.map((t) => {
                  const isOverdue = !t.done && t.dueDate && t.dueDate < today;
                  return (
                    <tr key={t.id} className={`border-t border-border/40 hover:bg-stone-50/60 group ${t.done ? "opacity-50" : ""}`}>
                      <td className="pl-4 pr-2 py-3">
                        <input type="checkbox" name="ids" value={t.id} className="rounded" />
                      </td>
                      <td className="px-2 py-3">
                        <form action={toggleTodo.bind(null, t.id, !t.done)}>
                          <button
                            type="submit"
                            className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                              t.done
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-600"
                                : "border-stone-300 hover:border-accent"
                            }`}
                            title={t.done ? "Mark as pending" : "Mark as done"}
                          >
                            {t.done && <span>&#10003;</span>}
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/todos/${t.id}/edit`} className={`font-medium hover:text-accent transition-colors ${t.done ? "line-through text-muted" : ""}`}>
                          {t.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {t.dueDate ? (
                          <span className={`text-xs ${isOverdue ? "text-danger font-medium" : "text-muted"}`}>
                            {isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block mr-1" />}
                            {new Date(t.dueDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {t.personName && t.personId ? (
                          <Link href={`/persons/${t.personId}`} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-medium hover:bg-teal-100 transition-colors">
                            {t.personName}
                          </Link>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {t.eventName && t.eventId ? (
                          <Link href={`/events/${t.eventId}/edit`} className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-md font-medium hover:bg-violet-100 transition-colors">
                            {t.eventName}
                          </Link>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.done ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Done
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-danger bg-red-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/todos/${t.id}/edit`} className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </Link>
                          <ConfirmDelete action={deleteTodo.bind(null, t.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </BulkActions>
      )}

      <Pagination total={total} page={page} baseUrl="/todos" searchParams={sp} />
    </div>
  );
}
