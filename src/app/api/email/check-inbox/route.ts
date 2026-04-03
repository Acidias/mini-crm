import { NextRequest, NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { db } from "@/db";
import { emails, persons } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { getImapConfig } from "@/lib/email";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  // Allow cron or authenticated requests
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const config = getImapConfig();
  if (!config.auth.user || !config.auth.pass) {
    return NextResponse.json({ error: "IMAP not configured" }, { status: 500 });
  }

  const client = new ImapFlow(config);
  let fetched = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Get messages from the last 7 days that we haven't seen
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for await (const message of client.fetch(
        { since, seen: false },
        {
          envelope: true,
          source: true,
          uid: true,
        }
      )) {
        const envelope = message.envelope;
        if (!envelope) continue;

        const messageId = envelope.messageId || `imap-${message.uid}`;

        // Skip if we already have this email
        const [existing] = await db
          .select({ id: emails.id })
          .from(emails)
          .where(eq(emails.resendId, messageId))
          .limit(1);
        if (existing) continue;

        const fromAddress = envelope.from?.[0]?.address || "";
        const toAddress = envelope.to?.[0]?.address || "";
        const subject = envelope.subject || "";

        // Parse body from source
        let bodyText = "";
        let bodyHtml = "";
        if (message.source) {
          const source = message.source.toString();
          // Simple extraction - get text after headers
          const parts = source.split(/\r?\n\r?\n/);
          if (parts.length > 1) {
            const bodyPart = parts.slice(1).join("\n\n");
            if (bodyPart.includes("<html") || bodyPart.includes("<div")) {
              bodyHtml = bodyPart;
              bodyText = bodyPart.replace(/<[^>]*>/g, "").trim();
            } else {
              bodyText = bodyPart;
            }
          }
        }

        // Match sender to person
        const [matchedPerson] = fromAddress
          ? await db.select({ id: persons.id }).from(persons).where(ilike(persons.email, fromAddress)).limit(1)
          : [null];

        await db.insert(emails).values({
          resendId: messageId,
          direction: "inbound",
          fromAddress,
          toAddress,
          subject,
          bodyText: bodyText || null,
          bodyHtml: bodyHtml || null,
          personId: matchedPerson?.id || null,
          status: "sent",
          read: false,
        });

        // Update lastContactedAt
        if (matchedPerson?.id) {
          await db
            .update(persons)
            .set({ lastContactedAt: new Date(), updatedAt: new Date() })
            .where(eq(persons.id, matchedPerson.id));
        }

        fetched++;
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, fetched }, { status: 500 });
  }

  return NextResponse.json({ success: true, fetched });
}
