"use client";

import { useState } from "react";
import Link from "next/link";

type CalendarEvent = {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: string;
  companyName: string | null;
};

type CalendarTodo = {
  id: number;
  title: string;
  dueDate: string | null;
  done: boolean;
  personName: string | null;
};

export default function CalendarView({
  events,
  todos,
}: {
  events: CalendarEvent[];
  todos: CalendarTodo[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const monthName = currentDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Build lookup maps by date string
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  events.forEach((e) => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  const todosByDate: Record<string, CalendarTodo[]> = {};
  todos.forEach((t) => {
    if (t.dueDate) {
      if (!todosByDate[t.dueDate]) todosByDate[t.dueDate] = [];
      todosByDate[t.dueDate].push(t);
    }
  });

  const today = new Date().toISOString().split("T")[0];

  // Build calendar grid (6 rows x 7 cols)
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function dateStr(day: number): string {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="border border-border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            &larr;
          </button>
          <button
            onClick={goToday}
            className="border border-border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="border border-border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            &rarr;
          </button>
          <span className="ml-2 font-semibold text-lg">{monthName}</span>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 text-center text-xs text-muted uppercase tracking-wide font-medium bg-gray-50 border-b border-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={i} className="border-b border-r border-border min-h-[100px] bg-gray-50/30" />;
            }
            const ds = dateStr(day);
            const dayEvents = eventsByDate[ds] || [];
            const dayTodos = todosByDate[ds] || [];
            const isToday = ds === today;

            return (
              <div
                key={i}
                className={`border-b border-r border-border min-h-[100px] p-1.5 ${
                  isToday ? "bg-blue-50/50" : ""
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${
                  isToday
                    ? "bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center"
                    : "text-muted pl-1"
                }`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.map((e) => (
                    <Link
                      key={`e-${e.id}`}
                      href={`/events/${e.id}/edit`}
                      className={`block text-xs px-1.5 py-0.5 rounded truncate ${
                        e.status === "cancelled"
                          ? "bg-gray-100 text-gray-400 line-through"
                          : e.status === "attended"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {e.name}
                    </Link>
                  ))}
                  {dayTodos.map((t) => (
                    <Link
                      key={`t-${t.id}`}
                      href={`/todos/${t.id}/edit`}
                      className={`block text-xs px-1.5 py-0.5 rounded truncate ${
                        t.done
                          ? "bg-gray-100 text-gray-400 line-through"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {t.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          Event
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
          To-Do
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          Attended
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
          Done / Cancelled
        </div>
      </div>
    </div>
  );
}
