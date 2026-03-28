"use server";

import { db } from "@/db";
import { tags, entityTags } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createTag(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const colour = (formData.get("colour") as string) || "#6b7280";
  if (!name) return;
  await db.insert(tags).values({ name, colour }).onConflictDoNothing();
  revalidatePath("/");
}

export async function deleteTag(id: number) {
  await db.delete(tags).where(eq(tags.id, id));
  revalidatePath("/");
}

export async function addTagToPerson(tagId: number, personId: number) {
  await db.insert(entityTags).values({ tagId, personId }).onConflictDoNothing();
  revalidatePath(`/persons/${personId}`);
}

export async function addTagToCompany(tagId: number, companyId: number) {
  await db.insert(entityTags).values({ tagId, companyId }).onConflictDoNothing();
  revalidatePath(`/companies/${companyId}`);
}

export async function removeEntityTag(entityTagId: number) {
  await db.delete(entityTags).where(eq(entityTags.id, entityTagId));
  revalidatePath("/");
}

export async function getAllTags() {
  return db.select().from(tags).orderBy(tags.name);
}

export async function getTagsForPerson(personId: number) {
  return db
    .select({ entityTagId: entityTags.id, tagId: tags.id, name: tags.name, colour: tags.colour })
    .from(entityTags)
    .innerJoin(tags, eq(entityTags.tagId, tags.id))
    .where(eq(entityTags.personId, personId));
}

export async function getTagsForCompany(companyId: number) {
  return db
    .select({ entityTagId: entityTags.id, tagId: tags.id, name: tags.name, colour: tags.colour })
    .from(entityTags)
    .innerJoin(tags, eq(entityTags.tagId, tags.id))
    .where(eq(entityTags.companyId, companyId));
}
