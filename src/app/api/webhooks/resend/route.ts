import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emails, persons } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Resend inbound email webhook payload
    // See: https://resend.com/docs/dashboard/webhooks/introduction
    const { type, data } = payload;

    if (type === "email.received") {
      const from = data.from;
      const to = data.to?.[0] || data.to;
      const subject = data.subject || null;
      const text = data.text || null;
      const html = data.html || null;

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
        resendId: data.email_id || null,
        direction: "inbound",
        fromAddress: from,
        toAddress: typeof to === "string" ? to : to?.toString() || "",
        subject,
        bodyText: text,
        bodyHtml: html,
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
