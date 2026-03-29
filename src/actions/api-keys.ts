"use server";

import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateKey(): string {
  const random = crypto.randomBytes(32).toString("base64url");
  return `mcrm_${random}`;
}

export async function createApiKey(formData: FormData) {
  const name = (formData.get("name") as string)?.trim() || "API Key";
  const plainKey = generateKey();
  const keyHash = hashKey(plainKey);
  const keyPrefix = plainKey.slice(0, 12);

  await db.insert(apiKeys).values({
    name,
    keyHash,
    keyPrefix,
  });

  revalidatePath("/profile");

  // Return the plain key - it can only be seen once
  return plainKey;
}

export async function deleteApiKey(id: number) {
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  revalidatePath("/profile");
}

export async function validateApiKey(key: string): Promise<boolean> {
  const keyHash = hashKey(key);
  const [found] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (found) {
    // Update last used
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, found.id));
    return true;
  }
  return false;
}
