import { db } from "@/db";
import { events, todos, companies, persons } from "@/db/schema";
import { eq } from "drizzle-orm";
import CalendarView from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const allEvents = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      location: events.location,
      status: events.status,
      companyName: companies.name,
    })
    .from(events)
    .leftJoin(companies, eq(events.companyId, companies.id));

  const allTodos = await db
    .select({
      id: todos.id,
      title: todos.title,
      dueDate: todos.dueDate,
      done: todos.done,
      personName: persons.name,
    })
    .from(todos)
    .leftJoin(persons, eq(todos.personId, persons.id));

  return (
    <div className="max-w-6xl">
      <CalendarView events={allEvents} todos={allTodos} />
    </div>
  );
}
