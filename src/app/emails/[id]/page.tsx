import Link from "next/link";
import { db } from "@/db";
import { emails, persons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { deleteEmail } from "@/actions/emails";
import ConfirmDelete from "@/components/confirm-delete";
import HtmlEmailBody from "./html-body";
import MarkAsRead from "./mark-read";

export default async function ViewEmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [email] = await db
    .select()
    .from(emails)
    .where(eq(emails.id, parseInt(id)));

  if (!email) notFound();

  // Get linked person if any
  let linkedPerson: { id: number; name: string } | null = null;
  if (email.personId) {
    const [p] = await db
      .select({ id: persons.id, name: persons.name })
      .from(persons)
      .where(eq(persons.id, email.personId));
    linkedPerson = p || null;
  }

  const isInbound = email.direction === "inbound";
  const isDraft = email.status === "draft";

  return (
    <div className="max-w-3xl">
      {isInbound && !email.read && <MarkAsRead emailId={email.id} />}
      <div className="mb-6">
        <Link href="/emails" className="text-muted text-sm hover:text-foreground">
          &larr; Back to Emails
        </Link>
      </div>

      <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold">{email.subject || "(No subject)"}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isDraft
                  ? "bg-amber-100 text-amber-700"
                  : isInbound
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {isDraft ? "Draft" : isInbound ? "Received" : "Sent"}
            </span>
          </div>
          <div className="text-sm text-muted space-y-1">
            <p>
              <span className="font-medium text-foreground">From:</span> {email.fromAddress}
            </p>
            <p>
              <span className="font-medium text-foreground">To:</span> {email.toAddress}
            </p>
            <p>
              <span className="font-medium text-foreground">Date:</span>{" "}
              {email.createdAt.toLocaleString("en-GB", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
            {linkedPerson && (
              <p>
                <span className="font-medium text-foreground">Contact:</span>{" "}
                <Link
                  href={`/persons/${linkedPerson.id}/edit`}
                  className="text-accent hover:underline"
                >
                  {linkedPerson.name}
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {email.bodyHtml && email.bodyHtml.length > 0 ? (
            <HtmlEmailBody html={email.bodyHtml} />
          ) : email.bodyText && email.bodyText.length > 0 ? (
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {email.bodyText}
            </pre>
          ) : (
            <p className="text-muted text-sm">(Empty message)</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-3 border-t border-border bg-gray-50/50 flex items-center justify-between">
          <div className="flex gap-2">
            {isDraft ? (
              <Link
                href={`/emails/compose?draft=${email.id}`}
                className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm hover:bg-accent-hover transition-colors"
              >
                Edit Draft
              </Link>
            ) : (
              <Link
                href={`/emails/compose?to=${encodeURIComponent(isInbound ? email.fromAddress : email.toAddress)}`}
                className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm hover:bg-accent-hover transition-colors"
              >
                {isInbound ? "Reply" : "Send Again"}
              </Link>
            )}
          </div>
          <ConfirmDelete action={deleteEmail.bind(null, email.id)} className="text-danger text-sm hover:underline" />
        </div>
      </div>
    </div>
  );
}
