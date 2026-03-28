import { db } from "@/db";
import { persons, companies } from "@/db/schema";
import { isNotNull, desc } from "drizzle-orm";
import { restorePerson, permanentDeletePerson } from "@/actions/persons";
import { restoreCompany, permanentDeleteCompany } from "@/actions/companies";
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

export default async function TrashPage() {
  const deletedPersons = await db
    .select()
    .from(persons)
    .where(isNotNull(persons.deletedAt))
    .orderBy(desc(persons.deletedAt));

  const deletedCompanies = await db
    .select()
    .from(companies)
    .where(isNotNull(companies.deletedAt))
    .orderBy(desc(companies.deletedAt));

  const isEmpty = deletedPersons.length === 0 && deletedCompanies.length === 0;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Trash</h1>
        <p className="text-muted text-sm mt-1">
          Deleted items can be restored or permanently removed.
        </p>
      </div>

      {isEmpty ? (
        <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
          <p className="text-muted">Trash is empty.</p>
        </div>
      ) : (
        <>
          {/* Deleted persons */}
          {deletedPersons.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
                Persons ({deletedPersons.length})
              </h2>
              <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
                {deletedPersons.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted">
                        {p.email && <>{p.email} &middot; </>}
                        Deleted {timeAgo(p.deletedAt!)}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <form action={restorePerson.bind(null, p.id)}>
                        <button type="submit" className="text-accent text-xs hover:underline">
                          Restore
                        </button>
                      </form>
                      <ConfirmDelete
                        action={permanentDeletePerson.bind(null, p.id)}
                        label="Delete forever"
                        message="This will permanently delete this person. This cannot be undone."
                        className="text-danger text-xs hover:underline"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deleted companies */}
          {deletedCompanies.length > 0 && (
            <div>
              <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
                Companies ({deletedCompanies.length})
              </h2>
              <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
                {deletedCompanies.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted">
                        {c.industry && <>{c.industry} &middot; </>}
                        Deleted {timeAgo(c.deletedAt!)}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <form action={restoreCompany.bind(null, c.id)}>
                        <button type="submit" className="text-accent text-xs hover:underline">
                          Restore
                        </button>
                      </form>
                      <ConfirmDelete
                        action={permanentDeleteCompany.bind(null, c.id)}
                        label="Delete forever"
                        message="This will permanently delete this company. This cannot be undone."
                        className="text-danger text-xs hover:underline"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
