import Link from "next/link";
import { db } from "@/db";
import { emails, persons } from "@/db/schema";
import { desc, eq, ilike, or, count, asc } from "drizzle-orm";
import { deleteEmail } from "@/actions/emails";
import SearchInput from "@/components/search-input";
import Pagination, { PAGE_SIZE } from "@/components/pagination";
import SortHeader from "@/components/sort-header";

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
  searchParams: Promise<{ q?: string; sort?: string; order?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const sortField = params.sort || "date";
  const sortOrder = params.order || "desc";
  const page = Math.max(1, parseInt(params.page || "1"));

  const whereClause = query
    ? or(
        ilike(emails.subject, `%${query}%`),
        ilike(emails.fromAddress, `%${query}%`),
        ilike(emails.toAddress, `%${query}%`)
      )
    : undefined;

  const [totalResult] = await db.select({ value: count() }).from(emails).where(whereClause);
  const total = totalResult.value;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortColumns: Record<string, any> = {
    date: emails.createdAt,
    subject: emails.subject,
    from: emails.fromAddress,
    to: emails.toAddress,
  };
  const sortCol = sortColumns[sortField] || emails.createdAt;
  const orderFn = sortOrder === "desc" ? desc : asc;

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
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const unreadCount = query
    ? 0
    : (await db.select({ value: count() }).from(emails).where(
        or(
          ilike(emails.direction, "inbound"),
        )
      ))[0]?.value || 0;

  const sp: Record<string, string> = {};
  if (query) sp.q = query;
  if (sortField !== "date") sp.sort = sortField;
  if (sortOrder !== "desc") sp.order = sortOrder;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Emails</h1>
          <p className="text-muted text-sm mt-1">{total} total</p>
        </div>
        <div className="flex gap-3 items-center">
          <SearchInput placeholder="Search emails..." />
          <Link href="/emails/compose" className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors">
            Compose
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
          <p className="text-muted mb-3">{query ? "No emails match your search." : "No emails yet."}</p>
          {!query && <Link href="/emails/compose" className="text-accent hover:underline text-sm">Send your first email</Link>}
        </div>
      ) : (
        <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
          {allEmails.map((e) => {
            const isInbound = e.direction === "inbound";
            const isUnread = !e.read && isInbound;
            return (
              <div
                key={e.id}
                className={`flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 hover:bg-gray-50/50 ${isUnread ? "bg-blue-50/30" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isInbound ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                  {isInbound ? "IN" : "OUT"}
                </div>
                <Link href={`/emails/${e.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"}`}>
                      {isInbound ? e.fromAddress : e.toAddress}
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
                  <span className="text-xs text-muted">{timeAgo(e.createdAt)}</span>
                  <form action={deleteEmail.bind(null, e.id)}>
                    <button type="submit" className="text-danger text-xs hover:underline">Delete</button>
                  </form>
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
