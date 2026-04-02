import Link from "next/link";
import { db } from "@/db";
import { persons, emails } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { sendEmail, saveDraft } from "@/actions/emails";
import { FROM_ADDRESSES } from "@/lib/resend";
import { getSetting } from "@/actions/settings";
import AiRewrite from "./ai-rewrite";
import { Refreshable } from "@/components/refreshable";

export default async function ComposeEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; personId?: string; draft?: string }>;
}) {
  const params = await searchParams;
  const allPersons = await db.select().from(persons).where(isNull(persons.deletedAt));

  // Load draft if editing one
  let draft: {
    id: number;
    fromAddress: string;
    toAddress: string;
    subject: string | null;
    bodyText: string | null;
  } | null = null;

  if (params.draft) {
    const [d] = await db
      .select()
      .from(emails)
      .where(eq(emails.id, parseInt(params.draft)));
    if (d && d.status === "draft") {
      draft = d;
    }
  }

  // Pre-fill "to" from query params or draft
  let prefillTo = draft?.toAddress || params.to || "";
  if (!prefillTo && params.personId) {
    const person = allPersons.find((p) => p.id === parseInt(params.personId!));
    if (person?.email) prefillTo = person.email;
  }

  const signature = await getSetting("email_signature");
  const prefillFrom = draft?.fromAddress || FROM_ADDRESSES[0];
  const prefillSubject = draft?.subject || "";
  const prefillBody = draft?.bodyText || "";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/emails" className="text-muted text-sm hover:text-foreground">
          &larr; Back to Emails
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          {draft ? "Edit Draft" : "Compose Email"}
        </h1>
      </div>

      <Refreshable>
      <form id="compose-form" action={sendEmail} className="bg-card-bg rounded-xl border border-border p-6 space-y-5">
        {draft && <input type="hidden" name="draftId" value={draft.id} />}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">From</label>
            <select
              name="from"
              defaultValue={prefillFrom}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              {FROM_ADDRESSES.map((addr) => (
                <option key={addr} value={addr}>
                  {addr}
                </option>
              ))}
            </select>
          </div>
          <div></div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">To *</label>
          <div className="flex gap-2">
            <input
              name="to"
              type="email"
              required
              defaultValue={prefillTo}
              className="border border-border rounded-lg flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="recipient@example.com"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Subject</label>
          <input
            name="subject"
            defaultValue={prefillSubject}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Message *</label>
          <textarea
            name="body"
            required
            rows={10}
            defaultValue={prefillBody}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono"
          />
          <AiRewrite formId="compose-form" />
          {signature && (
            <div className="mt-2 border-t border-border pt-2">
              <p className="text-xs text-muted mb-1">Signature (auto-appended):</p>
              <pre className="text-xs text-muted whitespace-pre-wrap font-mono bg-stone-50 rounded px-2 py-1.5">{signature}</pre>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Send Email
          </button>
          <button
            type="submit"
            formAction={saveDraft}
            className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-stone-50 transition-colors"
          >
            Save as Draft
          </button>
          <Link
            href="/emails"
            className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-stone-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
      </Refreshable>
    </div>
  );
}
