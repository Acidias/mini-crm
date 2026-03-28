"use server";

import { db } from "@/db";
import { activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createActivity(formData: FormData) {
  const personId = formData.get("personId") as string;
  const companyId = formData.get("companyId") as string;
  await db.insert(activities).values({
    type: formData.get("type") as string,
    title: formData.get("title") as string,
    notes: (formData.get("notes") as string) || null,
    personId: personId ? parseInt(personId) : null,
    companyId: companyId ? parseInt(companyId) : null,
  });
  const returnTo = formData.get("returnTo") as string;
  if (returnTo) revalidatePath(returnTo);
  revalidatePath("/");
}

export async function deleteActivity(id: number) {
  // Look up the activity to know which detail pages to revalidate
  const [activity] = await db.select().from(activities).where(eq(activities.id, id));
  await db.delete(activities).where(eq(activities.id, id));
  if (activity?.personId) revalidatePath(`/persons/${activity.personId}`);
  if (activity?.companyId) revalidatePath(`/companies/${activity.companyId}`);
  revalidatePath("/");
}
