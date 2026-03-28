"use server";

import { db } from "@/db";
import { todos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTodo(formData: FormData) {
  const personId = formData.get("personId") as string;
  const eventId = formData.get("eventId") as string;
  await db.insert(todos).values({
    title: formData.get("title") as string,
    dueDate: (formData.get("dueDate") as string) || null,
    notes: (formData.get("notes") as string) || null,
    personId: personId ? parseInt(personId) : null,
    eventId: eventId ? parseInt(eventId) : null,
  });
  redirect("/todos");
}

export async function updateTodo(id: number, formData: FormData) {
  const personId = formData.get("personId") as string;
  const eventId = formData.get("eventId") as string;
  await db
    .update(todos)
    .set({
      title: formData.get("title") as string,
      dueDate: (formData.get("dueDate") as string) || null,
      notes: (formData.get("notes") as string) || null,
      personId: personId ? parseInt(personId) : null,
      eventId: eventId ? parseInt(eventId) : null,
      updatedAt: new Date(),
    })
    .where(eq(todos.id, id));
  redirect("/todos");
}

export async function toggleTodo(id: number, done: boolean) {
  await db
    .update(todos)
    .set({ done, updatedAt: new Date() })
    .where(eq(todos.id, id));
  revalidatePath("/todos");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function deleteTodo(id: number) {
  await db.delete(todos).where(eq(todos.id, id));
  redirect("/todos");
}
