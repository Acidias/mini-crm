import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emails, persons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getResend } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { type, data } = payload;

    if (type === "email.received") {
      const emailId = data.email_id;
      const from = data.from;
      const to = data.to?.[0] || data.to;
      const subject = data.subject || null;

      // Fetch full email content from Resend API
      // Webhooks only contain metadata, not the body
      let bodyText: string | null = null;
      let bodyHtml: string | null = null;

      if (emailId) {
        try {
          const resend = getResend();
          const fullEmail = await resend.emails.get(emailId);
          if (fullEmail.data) {
            const emailData = fullEmail.data as unknown as Record<string, string>;
            bodyText = emailData.text || null;
            bodyHtml = emailData.html || null;
          }
        } catch {
          // If fetch fails, store without body - better than losing the email entirely
        }
      }

      // Try to match sender to a person in the CRM
      let personId: number | null = null;
      if (from) {
        const [person] = await db
          .select({ id: persons.id })
          .from(persons)
          .where(eq(persons.email, from))
          .limit(1);
        personId = person?.id || null;
      }

      await db.insert(emails).values({
        resendId: emailId || null,
        direction: "inbound",
        fromAddress: from,
        toAddress: typeof to === "string" ? to : to?.toString() || "",
        subject,
        bodyText,
        bodyHtml,
        personId,
        read: false,
      });

      // Update lastContactedAt if person found
      if (personId) {
        await db
          .update(persons)
          .set({ lastContactedAt: new Date(), updatedAt: new Date() })
          .where(eq(persons.id, personId));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
