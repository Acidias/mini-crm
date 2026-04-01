"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row?.value || "";
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const k of keys) {
    result[k] = rows.find((r) => r.key === k)?.value || "";
  }
  return result;
}

export async function saveSetting(key: string, value: string) {
  const [existing] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing) {
    await db.update(settings).set({ value }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

export async function saveSettings(formData: FormData) {
  const keys = ["email_signature", "company_description", "ai_tone"];
  for (const key of keys) {
    const value = (formData.get(key) as string) || "";
    await saveSetting(key, value);
  }
  revalidatePath("/profile");
}
