import Link from "next/link";
import { db } from "@/db";
import { emails, persons } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { deleteEmail } from "@/actions/emails";

export const dynamic = "force-dynamic";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function EmailsPage() {
  const allEmails = await db
    .select({
      id: emails.id,
      direction: emails.direction,
      fromAddress: emails.fromAddress,
      toAddress: emails.toAddress,
      subject: emails.subject,
      read: emails.read,
      personName: persons.name,
      personId: emails.personId,
      createdAt: emails.createdAt,
    })
    .from(emails)
    .leftJoin(persons, eq(emails.personId, persons.id))
    .orderBy(desc(emails.createdAt));

  const unreadCount = allEmails.filter((e) => !e.read && e.direction === "inbound").length;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Emails</h1>
          <p className="text-muted text-sm mt-1">
            {allEmails.length} total
            {unreadCount > 0 && (
              <> &middot; <span className="text-accent font-medium">{unreadCount} unread</span></>
            )}
          </p>
        </div>
        <Link
          href="/emails/compose"
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          Compose
        </Link>
      </div>

      {allEmails.length === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
          <p className="text-muted mb-3">No emails yet.</p>
          <Link href="/emails/compose" className="text-accent hover:underline text-sm">
            Send your first email
          </Link>
        </div>
      ) : (
        <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
          {allEmails.map((e) => {
            const isInbound = e.direction === "inbound";
            const isUnread = !e.read && isInbound;
            return (
              <div
                key={e.id}
                className={`flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 hover:bg-gray-50/50 ${
                  isUnread ? "bg-blue-50/30" : ""
                }`}
              >
                {/* Direction indicator */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isInbound
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {isInbound ? "IN" : "OUT"}
                </div>

                {/* Email content */}
                <Link href={`/emails/${e.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"}`}>
                      {isInbound ? e.fromAddress : e.toAddress}
                    </span>
                    {e.personName && (
                      <span className="text-xs bg-gray-100 text-muted px-1.5 py-0.5 rounded flex-shrink-0">
                        {e.personName}
                      </span>
                    )}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm truncate ${isUnread ? "text-foreground" : "text-muted"}`}>
                    {e.subject || "(No subject)"}
                  </p>
                </Link>

                {/* Time and actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted">{timeAgo(e.createdAt)}</span>
                  <form action={deleteEmail.bind(null, e.id)}>
                    <button type="submit" className="text-danger text-xs hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
