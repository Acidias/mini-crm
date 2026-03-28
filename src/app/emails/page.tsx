import Link from "next/link";
import { db } from "@/db";
import { emails, persons } from "@/db/schema";
import { desc, eq, ilike, or, count, asc, ne, and } from "drizzle-orm";
import { deleteEmail } from "@/actions/emails";
import SearchInput from "@/components/search-input";
import Pagination, { PAGE_SIZE } from "@/components/pagination";
import ConfirmDelete from "@/components/confirm-delete";

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

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = Math.max(1, parseInt(params.page || "1"));
  const tab = params.tab || "all";

  const isDraftsTab = tab === "drafts";

  // Base filter by tab
  const tabFilter = isDraftsTab
    ? eq(emails.status, "draft")
    : ne(emails.status, "draft");

  const searchFilter = query
    ? or(
        ilike(emails.subject, `%${query}%`),
        ilike(emails.fromAddress, `%${query}%`),
        ilike(emails.toAddress, `%${query}%`)
      )
    : undefined;

  const whereClause = searchFilter
    ? and(tabFilter, searchFilter)
    : tabFilter;

  const [totalResult] = await db.select({ value: count() }).from(emails).where(whereClause);
  const total = totalResult.value;

  // Count drafts for badge
  const [draftCountResult] = await db.select({ value: count() }).from(emails).where(eq(emails.status, "draft"));
  const draftCount = draftCountResult.value;

  const allEmails = await db
    .select({
      id: emails.id,
      direction: emails.direction,
      fromAddress: emails.fromAddress,
      toAddress: emails.toAddress,
      subject: emails.subject,
      status: emails.status,
      read: emails.read,
      personName: persons.name,
      personId: emails.personId,
      createdAt: emails.createdAt,
      updatedAt: emails.updatedAt,
    })
    .from(emails)
    .leftJoin(persons, eq(emails.personId, persons.id))
    .where(whereClause)
    .orderBy(desc(isDraftsTab ? emails.updatedAt : emails.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const sp: Record<string, string> = {};
  if (query) sp.q = query;
  if (isDraftsTab) sp.tab = "drafts";

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Emails</h1>
          <p className="text-muted text-sm mt-1">{total} {isDraftsTab ? "drafts" : "emails"}</p>
        </div>
        <div className="flex gap-3 items-center">
          <SearchInput placeholder="Search emails..." />
          <Link href="/emails/compose" className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors">
            Compose
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <Link
          href="/emails"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            !isDraftsTab
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          All Emails
        </Link>
        <Link
          href="/emails?tab=drafts"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
            isDraftsTab
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Drafts
          {draftCount > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
              {draftCount}
            </span>
          )}
        </Link>
      </div>

      {total === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
          <p className="text-muted mb-3">
            {query
              ? "No emails match your search."
              : isDraftsTab
              ? "No drafts."
              : "No emails yet."}
          </p>
          {!query && (
            <Link href="/emails/compose" className="text-accent hover:underline text-sm">
              {isDraftsTab ? "Start a new draft" : "Send your first email"}
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
          {allEmails.map((e) => {
            const isInbound = e.direction === "inbound";
            const isDraft = e.status === "draft";
            const isUnread = !e.read && isInbound;
            return (
              <div
                key={e.id}
                className={`flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 hover:bg-gray-50/50 ${isUnread ? "bg-blue-50/30" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isDraft
                    ? "bg-amber-100 text-amber-700"
                    : isInbound
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {isDraft ? "DR" : isInbound ? "IN" : "OUT"}
                </div>
                <Link href={isDraft ? `/emails/compose?draft=${e.id}` : `/emails/${e.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"}`}>
                      {isDraft
                        ? (e.toAddress || "No recipient")
                        : isInbound
                        ? e.fromAddress
                        : e.toAddress}
                    </span>
                    {e.personName && (
                      <span className="text-xs bg-gray-100 text-muted px-1.5 py-0.5 rounded flex-shrink-0">{e.personName}</span>
                    )}
                    {isUnread && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                  </div>
                  <p className={`text-sm truncate ${isUnread ? "text-foreground" : "text-muted"}`}>
                    {e.subject || "(No subject)"}
                  </p>
                </Link>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted">{timeAgo(isDraft && e.updatedAt ? e.updatedAt : e.createdAt)}</span>
                  {isDraft && (
                    <Link href={`/emails/compose?draft=${e.id}`} className="text-accent text-xs hover:underline">
                      Edit
                    </Link>
                  )}
                  <ConfirmDelete action={deleteEmail.bind(null, e.id)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination total={total} page={page} baseUrl="/emails" searchParams={sp} />
    </div>
  );
}
