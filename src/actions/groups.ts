"use server";

import { db } from "@/db";
import { groups, personGroups, persons } from "@/db/schema";
import { eq, count, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createGroup(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const colour = (formData.get("colour") as string) || "#6b7280";
  if (!name) return;
  await db.insert(groups).values({ name, description, colour }).onConflictDoNothing();
  revalidatePath("/groups");
}

export async function updateGroup(id: number, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const colour = (formData.get("colour") as string) || "#6b7280";
  if (!name) return;
  await db.update(groups).set({ name, description, colour }).where(eq(groups.id, id));
  revalidatePath("/groups");
}

export async function deleteGroup(id: number) {
  await db.delete(groups).where(eq(groups.id, id));
  revalidatePath("/groups");
  redirect("/groups");
}

export async function addPersonToGroup(groupId: number, personId: number) {
  await db.insert(personGroups).values({ groupId, personId }).onConflictDoNothing();
  revalidatePath("/groups");
  revalidatePath(`/persons/${personId}`);
}

export async function removePersonFromGroup(personGroupId: number) {
  await db.delete(personGroups).where(eq(personGroups.id, personGroupId));
  revalidatePath("/groups");
  revalidatePath("/persons");
}

export async function getAllGroups() {
  const result = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      colour: groups.colour,
      createdAt: groups.createdAt,
      memberCount: count(personGroups.id),
    })
    .from(groups)
    .leftJoin(personGroups, eq(groups.id, personGroups.groupId))
    .groupBy(groups.id)
    .orderBy(groups.name);
  return result;
}

export async function getGroupsForPerson(personId: number) {
  return db
    .select({
      personGroupId: personGroups.id,
      groupId: groups.id,
      name: groups.name,
      colour: groups.colour,
    })
    .from(personGroups)
    .innerJoin(groups, eq(personGroups.groupId, groups.id))
    .where(eq(personGroups.personId, personId));
}

export async function getGroupMembers(groupId: number) {
  return db
    .select({
      personGroupId: personGroups.id,
      personId: persons.id,
      name: persons.name,
      email: persons.email,
      position: persons.position,
    })
    .from(personGroups)
    .innerJoin(persons, eq(personGroups.personId, persons.id))
    .where(eq(personGroups.groupId, groupId));
}
