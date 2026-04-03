"use server";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateEmail, validateUrl, validateRequired, cleanString } from "@/lib/validation";

export async function createCompany(formData: FormData) {
  const name = validateRequired(formData.get("name") as string, "Company name");
  const priority = Math.min(10, Math.max(1, parseInt(formData.get("priority") as string) || 5));

  await db.insert(companies).values({
    name,
    website: validateUrl(formData.get("website") as string),
    industry: cleanString(formData.get("industry") as string),
    email: validateEmail(formData.get("email") as string),
    phone: cleanString(formData.get("phone") as string),
    address: cleanString(formData.get("address") as string),
    notes: cleanString(formData.get("notes") as string),
    priority,
  });
  redirect("/companies");
}

export async function updateCompany(id: number, formData: FormData) {
  const name = validateRequired(formData.get("name") as string, "Company name");
  const priority = Math.min(10, Math.max(1, parseInt(formData.get("priority") as string) || 5));

  await db
    .update(companies)
    .set({
      name,
      website: validateUrl(formData.get("website") as string),
      industry: cleanString(formData.get("industry") as string),
      email: validateEmail(formData.get("email") as string),
      phone: cleanString(formData.get("phone") as string),
      address: cleanString(formData.get("address") as string),
      notes: cleanString(formData.get("notes") as string),
      priority,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, id));
  redirect("/companies");
}

export async function deleteCompany(id: number) {
  await db.update(companies).set({ deletedAt: new Date() }).where(eq(companies.id, id));
  revalidatePath("/companies");
  revalidatePath("/trash");
}

export async function restoreCompany(id: number) {
  await db.update(companies).set({ deletedAt: null }).where(eq(companies.id, id));
  revalidatePath("/companies");
  revalidatePath("/trash");
}

export async function permanentDeleteCompany(id: number) {
  await db.delete(companies).where(eq(companies.id, id));
  revalidatePath("/trash");
}
