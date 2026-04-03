"use server";

import { db } from "@/db";
import { persons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateEmail, validateRequired, cleanString } from "@/lib/validation";

export async function createPerson(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  const name = validateRequired(formData.get("name") as string, "Name");
  const email = validateEmail(formData.get("email") as string);
  const priority = Math.min(10, Math.max(1, parseInt(formData.get("priority") as string) || 5));

  await db.insert(persons).values({
    name,
    email,
    phone: cleanString(formData.get("phone") as string),
    position: cleanString(formData.get("position") as string),
    linkedin: cleanString(formData.get("linkedin") as string),
    notes: cleanString(formData.get("notes") as string),
    companyId: companyId ? parseInt(companyId) : null,
    priority,
  });
  redirect("/persons");
}

export async function updatePerson(id: number, formData: FormData) {
  const companyId = formData.get("companyId") as string;
  const name = validateRequired(formData.get("name") as string, "Name");
  const email = validateEmail(formData.get("email") as string);
  const priority = Math.min(10, Math.max(1, parseInt(formData.get("priority") as string) || 5));

  await db
    .update(persons)
    .set({
      name,
      email,
      phone: cleanString(formData.get("phone") as string),
      position: cleanString(formData.get("position") as string),
      linkedin: cleanString(formData.get("linkedin") as string),
      notes: cleanString(formData.get("notes") as string),
      companyId: companyId ? parseInt(companyId) : null,
      priority,
      updatedAt: new Date(),
    })
    .where(eq(persons.id, id));
  redirect("/persons");
}

export async function deletePerson(id: number) {
  await db.update(persons).set({ deletedAt: new Date() }).where(eq(persons.id, id));
  revalidatePath("/persons");
  revalidatePath("/trash");
}

export async function restorePerson(id: number) {
  await db.update(persons).set({ deletedAt: null }).where(eq(persons.id, id));
  revalidatePath("/persons");
  revalidatePath("/trash");
}

export async function permanentDeletePerson(id: number) {
  await db.delete(persons).where(eq(persons.id, id));
  revalidatePath("/trash");
}

export async function markAsContacted(id: number) {
  await db
    .update(persons)
    .set({
      lastContactedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(persons.id, id));
  revalidatePath("/persons");
  revalidatePath("/");
}
