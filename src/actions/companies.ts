"use server";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCompany(formData: FormData) {
  await db.insert(companies).values({
    name: formData.get("name") as string,
    website: (formData.get("website") as string) || null,
    industry: (formData.get("industry") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    address: (formData.get("address") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });
  redirect("/companies");
}

export async function updateCompany(id: number, formData: FormData) {
  await db
    .update(companies)
    .set({
      name: formData.get("name") as string,
      website: (formData.get("website") as string) || null,
      industry: (formData.get("industry") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      notes: (formData.get("notes") as string) || null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, id));
  redirect("/companies");
}

export async function deleteCompany(id: number) {
  await db.delete(companies).where(eq(companies.id, id));
  revalidatePath("/companies");
}
