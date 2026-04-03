import Link from "next/link";
import { db } from "@/db";
import { groups, personGroups, persons } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateGroup, deleteGroup, addPersonToGroup, removePersonFromGroup } from "@/actions/groups";
import ConfirmDelete from "@/components/confirm-delete";
import ReviewCards from "@/components/review-cards";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const groupId = parseInt(id);

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) notFound();

  // Get current members
  const members = await db
    .select({
      personGroupId: personGroups.id,
      personId: persons.id,
      name: persons.name,
      email: persons.email,
      position: persons.position,
    })
    .from(personGroups)
    .innerJoin(persons, eq(personGroups.personId, persons.id))
    .where(eq(personGroups.groupId, groupId));

  // Get persons NOT in this group (for adding)
  const memberIds = members.map((m) => m.personId);
  const allPersons = await db.select({ id: persons.id, name: persons.name, email: persons.email }).from(persons).where(isNull(persons.deletedAt));
  const nonMembers = allPersons.filter((p) => !memberIds.includes(p.id));

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/groups" className="text-muted text-sm hover:text-foreground transition-colors">
          &larr; Back to Groups
        </Link>
      </div>

      {/* Group header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: group.colour }}
          >
            {group.name[0].toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
            {group.description && <p className="text-muted text-sm mt-0.5">{group.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {members.length > 0 && (
            <ReviewCards
              personIds={members.map((m) => m.personId)}
              trigger={
                <button className="bg-accent text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
                  Review Members
                </button>
              }
            />
          )}
          <Link href={`/persons?group=${groupId}`} className="border border-border px-3 py-2 rounded-lg text-sm text-muted hover:bg-stone-50 transition-colors">
            View in Persons
          </Link>
          <ConfirmDelete action={deleteGroup.bind(null, groupId)} className="text-danger text-sm hover:underline px-3 py-2" />
        </div>
      </div>

      {/* Edit group */}
      <form action={updateGroup.bind(null, groupId)} className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm mb-6">
        <h2 className="font-semibold text-sm mb-3">Edit Group</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Name</label>
            <input
              name="name"
              required
              defaultValue={group.name}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Description</label>
            <input
              name="description"
              defaultValue={group.description || ""}
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Colour</label>
            <input name="colour" type="color" defaultValue={group.colour} className="w-10 h-9 rounded-lg border border-border cursor-pointer" />
          </div>
          <button type="submit" className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
            Save
          </button>
        </div>
      </form>

      {/* Add members */}
      {nonMembers.length > 0 && (
        <div className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-sm mb-3">Add Members</h2>
          <div className="flex flex-wrap gap-2">
            {nonMembers.map((p) => (
              <form key={p.id} action={addPersonToGroup.bind(null, groupId, p.id)}>
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent hover:text-accent transition-colors"
                >
                  + {p.name}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* Current members */}
      <div className="bg-card-bg rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-semibold text-sm">{members.length} Member{members.length !== 1 ? "s" : ""}</h2>
        </div>
        {members.length === 0 ? (
          <p className="text-muted text-sm px-5 py-8 text-center">No members yet. Add persons above.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {members.map((m) => (
                <tr key={m.personGroupId} className="border-t border-border/40 hover:bg-stone-50/60 group">
                  <td className="px-5 py-3">
                    <Link href={`/persons/${m.personId}`} className="font-medium hover:text-accent transition-colors">
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{m.position || "-"}</td>
                  <td className="px-5 py-3 text-muted text-xs">{m.email || "-"}</td>
                  <td className="px-5 py-3 text-right">
                    <form action={removePersonFromGroup.bind(null, m.personGroupId)}>
                      <button type="submit" className="text-xs text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
