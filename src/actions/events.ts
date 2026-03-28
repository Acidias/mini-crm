"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEvent(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  await db.insert(events).values({
    name: formData.get("name") as string,
    date: formData.get("date") as string,
    location: (formData.get("location") as string) || null,
    description: (formData.get("description") as string) || null,
    companyId: companyId ? parseInt(companyId) : null,
  });
  redirect("/events");
}

export async function updateEvent(id: number, formData: FormData) {
  const companyId = formData.get("companyId") as string;
  await db
    .update(events)
    .set({
      name: formData.get("name") as string,
      date: formData.get("date") as string,
      location: (formData.get("location") as string) || null,
      description: (formData.get("description") as string) || null,
      companyId: companyId ? parseInt(companyId) : null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));
  redirect("/events");
}

export async function updateEventStatus(id: number, status: string) {
  await db
    .update(events)
    .set({ status, updatedAt: new Date() })
    .where(eq(events.id, id));
  revalidatePath("/events");
  revalidatePath("/");
}

export async function deleteEvent(id: number) {
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/events");
}
