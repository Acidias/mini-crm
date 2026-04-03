"use server";

import { db } from "@/db";
import { emails, persons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendSmtpEmail, FROM_ADDRESS } from "@/lib/email";
import { getSetting } from "@/actions/settings";

async function findPersonByEmail(email: string) {
  const [person] = await db
    .select({ id: persons.id })
    .from(persons)
    .where(eq(persons.email, email))
    .limit(1);
  return person?.id || null;
}

export async function sendEmail(formData: FormData) {
  const to = formData.get("to") as string;
  const subject = formData.get("subject") as string;
  const rawBody = formData.get("body") as string;
  const from = (formData.get("from") as string) || FROM_ADDRESS;
  const draftId = formData.get("draftId") as string;

  // Append signature
  const signature = await getSetting("email_signature");
  const body = signature ? `${rawBody}\n\n${signature}` : rawBody;

  const { messageId } = await sendSmtpEmail({
    from,
    to,
    subject,
    text: body,
  });

  const personId = await findPersonByEmail(to);

  // If sending from a draft, update it instead of creating new
  if (draftId) {
    await db
      .update(emails)
      .set({
        resendId: messageId,
        direction: "outbound",
        fromAddress: from,
        toAddress: to,
        subject,
        bodyText: body,
        personId,
        status: "sent",
        read: true,
        updatedAt: new Date(),
      })
      .where(eq(emails.id, parseInt(draftId)));
  } else {
    await db.insert(emails).values({
      resendId: messageId,
      direction: "outbound",
      fromAddress: from,
      toAddress: to,
      subject,
      bodyText: body,
      personId,
      status: "sent",
      read: true,
    });
  }

  // Auto-update lastContactedAt if person found
  if (personId) {
    await db
      .update(persons)
      .set({ lastContactedAt: new Date(), updatedAt: new Date() })
      .where(eq(persons.id, personId));
  }

  revalidatePath("/emails");
  redirect("/emails");
}

export async function saveDraft(formData: FormData) {
  const to = (formData.get("to") as string) || "";
  const subject = (formData.get("subject") as string) || "";
  const body = (formData.get("body") as string) || "";
  const from = (formData.get("from") as string) || FROM_ADDRESS;
  const draftId = formData.get("draftId") as string;

  const personId = to ? await findPersonByEmail(to) : null;

  if (draftId) {
    await db
      .update(emails)
      .set({
        fromAddress: from,
        toAddress: to,
        subject: subject || null,
        bodyText: body || null,
        personId,
        updatedAt: new Date(),
      })
      .where(eq(emails.id, parseInt(draftId)));
  } else {
    await db.insert(emails).values({
      direction: "outbound",
      fromAddress: from,
      toAddress: to,
      subject: subject || null,
      bodyText: body || null,
      personId,
      status: "draft",
      read: true,
    });
  }

  revalidatePath("/emails");
  redirect("/emails?tab=drafts");
}

export async function markEmailRead(id: number) {
  await db.update(emails).set({ read: true }).where(eq(emails.id, id));
  revalidatePath("/emails");
}

export async function deleteEmail(id: number) {
  await db.delete(emails).where(eq(emails.id, id));
  redirect("/emails");
}
