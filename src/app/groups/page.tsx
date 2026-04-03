import Link from "next/link";
import { getAllGroups } from "@/actions/groups";
import { createGroup } from "@/actions/groups";
import ConfirmDelete from "@/components/confirm-delete";
import { deleteGroup } from "@/actions/groups";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const allGroups = await getAllGroups();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted text-sm mt-0.5">{allGroups.length} group{allGroups.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Create new group */}
      <form action={createGroup} className="bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm mb-6">
        <h2 className="font-semibold text-sm mb-3">Create New Group</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Name *</label>
            <input
              name="name"
              required
              placeholder="e.g. Networking Organisations"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Description</label>
            <input
              name="description"
              placeholder="Optional description"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Colour</label>
            <input name="colour" type="color" defaultValue="#0d9488" className="w-10 h-9 rounded-lg border border-border cursor-pointer" />
          </div>
          <button
            type="submit"
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            Create
          </button>
        </div>
      </form>

      {/* Groups list */}
      {allGroups.length === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border/60 p-12 shadow-sm text-center">
          <p className="text-muted mb-1 font-medium">No groups yet.</p>
          <p className="text-muted text-sm">Create one above to start organising your contacts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {allGroups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="group bg-card-bg rounded-xl border border-border/60 p-5 shadow-sm hover:border-accent/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: g.colour }}
                  >
                    {g.name[0].toUpperCase()}
                  </span>
                  <div>
                    <h3 className="font-semibold group-hover:text-accent transition-colors">{g.name}</h3>
                    {g.description && (
                      <p className="text-xs text-muted mt-0.5">{g.description}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                  {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
