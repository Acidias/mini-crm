"use server";

import { db } from "@/db";
import { persons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPerson(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  await db.insert(persons).values({
    name: formData.get("name") as string,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    position: (formData.get("position") as string) || null,
    notes: (formData.get("notes") as string) || null,
    companyId: companyId ? parseInt(companyId) : null,
  });
  redirect("/persons");
}

export async function updatePerson(id: number, formData: FormData) {
  const companyId = formData.get("companyId") as string;
  await db
    .update(persons)
    .set({
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      position: (formData.get("position") as string) || null,
      notes: (formData.get("notes") as string) || null,
      companyId: companyId ? parseInt(companyId) : null,
      updatedAt: new Date(),
    })
    .where(eq(persons.id, id));
  redirect("/persons");
}

export async function deletePerson(id: number) {
  await db.delete(persons).where(eq(persons.id, id));
  revalidatePath("/persons");
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
