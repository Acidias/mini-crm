import Link from "next/link";
import { db } from "@/db";
import { emails, persons } from "@/db/schema";
import { desc, eq, ilike, or, count, asc, ne, and, isNull, isNotNull } from "drizzle-orm";
import { deleteEmail } from "@/actions/emails";
import SearchInput from "@/components/search-input";
import Pagination, { PAGE_SIZE } from "@/components/pagination";
import SortHeader from "@/components/sort-header";
import ConfirmDelete from "@/components/confirm-delete";
import FieldFilter from "@/components/field-filter";
import SortPersistence from "@/components/sort-persistence";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sortColumns: Record<string, any> = {
  date: emails.createdAt,
  subject: emails.subject,
  from: emails.fromAddress,
  to: emails.toAddress,
};

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string; sort?: string; order?: string; filter?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = Math.max(1, parseInt(params.page || "1"));
  const tab = params.tab || "all";
  const sortField = params.sort || "date";
  const sortOrder = params.order || "desc";
  const filters = Array.isArray(params.filter) ? params.filter : params.filter ? [params.filter] : [];

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldMap: Record<string, any> = {
    "direction:inbound": eq(emails.direction, "inbound"),
    "direction:outbound": eq(emails.direction, "outbound"),
    "read": eq(emails.read, true),
    "unread": eq(emails.read, false),
    "has:person": isNotNull(emails.personId),
    "missing:person": isNull(emails.personId),
  };
  const fieldFilters = filters.map((f) => fieldMap[f]).filter(Boolean);

  const conditions = [tabFilter, searchFilter, ...fieldFilters].filter(Boolean);
  const whereClause = and(...conditions);

  const [totalResult] = await db.select({ value: count() }).from(emails).where(whereClause);
  const total = totalResult.value;

  // Count drafts for badge
  const [draftCountResult] = await db.select({ value: count() }).from(emails).where(eq(emails.status, "draft"));
  const draftCount = draftCountResult.value;

  const sortCol = sortColumns[sortField] || emails.createdAt;
  const orderFn = sortOrder === "desc" ? desc : asc;

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
    .orderBy(orderFn(isDraftsTab ? emails.updatedAt : sortCol))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const sp: Record<string, string> = {};
  if (query) sp.q = query;
  if (isDraftsTab) sp.tab = "drafts";
  if (sortField !== "date") sp.sort = sortField;
  if (sortOrder !== "desc") sp.order = sortOrder;

  const emailFilterOptions = isDraftsTab
    ? []
    : [
        { label: "Inbound", value: "direction:inbound" },
        { label: "Outbound", value: "direction:outbound" },
        { label: "Read", value: "read" },
        { label: "Unread", value: "unread" },
        { label: "Linked to person", value: "has:person" },
        { label: "No person", value: "missing:person" },
      ];

  return (
    <div className="max-w-5xl">
      <SortPersistence pageKey="emails" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Emails</h1>
          <p className="text-muted text-sm mt-0.5">{total} {isDraftsTab ? "draft" : "email"}{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 items-center">
          <SearchInput placeholder="Search emails..." />
          {emailFilterOptions.length > 0 && <FieldFilter options={emailFilterOptions} />}
          <Link href="/emails/compose" className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm">
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
        <div className="bg-card-bg rounded-xl border border-border/60 p-16 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </div>
          <p className="text-muted mb-1 font-medium">
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
        <div className="bg-card-bg rounded-xl border border-border/60 shadow-sm overflow-hidden">
          {!isDraftsTab && (
            <div className="text-left text-[11px] uppercase tracking-wider text-muted/80 border-b border-border/60 flex px-4 py-2.5">
              <div className="w-12 flex-shrink-0"></div>
              <div className="flex-1 min-w-0 flex gap-4">
                <span className="font-semibold w-48 flex-shrink-0">
                  <SortHeader label="From / To" field="from" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                </span>
                <span className="font-semibold flex-1">
                  <SortHeader label="Subject" field="subject" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
                </span>
              </div>
              <div className="w-28 flex-shrink-0 text-right font-semibold">
                <SortHeader label="Date" field="date" currentSort={sortField} currentOrder={sortOrder} searchParams={sp} />
              </div>
            </div>
          )}
          {allEmails.map((e) => {
            const isInbound = e.direction === "inbound";
            const isDraft = e.status === "draft";
            const isUnread = !e.read && isInbound;
            return (
              <div
                key={e.id}
                className={`flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-stone-50/60 group ${isUnread ? "bg-teal-50/30" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isDraft
                    ? "bg-amber-100 text-amber-700"
                    : isInbound
                    ? "bg-green-100 text-green-700"
                    : "bg-teal-50 text-teal-700"
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
                      <span className="text-xs bg-stone-100 text-muted px-1.5 py-0.5 rounded flex-shrink-0">{e.personName}</span>
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
                    <Link href={`/emails/compose?draft=${e.id}`} className="text-accent text-xs hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                      Edit
                    </Link>
                  )}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ConfirmDelete action={deleteEmail.bind(null, e.id)} />
                  </span>
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
