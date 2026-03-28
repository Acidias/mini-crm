import { addTagToPerson, addTagToCompany, removeEntityTag, createTag } from "@/actions/tags";

type Tag = { entityTagId: number; tagId: number; name: string; colour: string };
type AvailableTag = { id: number; name: string; colour: string };

export default function TagManager({
  entityType,
  entityId,
  currentTags,
  allTags,
}: {
  entityType: "person" | "company";
  entityId: number;
  currentTags: Tag[];
  allTags: AvailableTag[];
}) {
  const unusedTags = allTags.filter(
    (t) => !currentTags.some((ct) => ct.tagId === t.id)
  );

  return (
    <div>
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {currentTags.length === 0 && (
          <span className="text-muted text-xs">No tags</span>
        )}
        {currentTags.map((t) => (
          <span
            key={t.entityTagId}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: t.colour }}
          >
            {t.name}
            <form action={removeEntityTag.bind(null, t.entityTagId)} className="inline">
              <button type="submit" className="hover:opacity-70 ml-0.5">&times;</button>
            </form>
          </span>
        ))}
      </div>

      {/* Add existing tag */}
      {unusedTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {unusedTags.map((t) => (
            <form
              key={t.id}
              action={
                entityType === "person"
                  ? addTagToPerson.bind(null, t.id, entityId)
                  : addTagToCompany.bind(null, t.id, entityId)
              }
            >
              <button
                type="submit"
                className="text-xs px-2 py-0.5 rounded-full border border-border text-muted hover:bg-gray-50 transition-colors"
              >
                + {t.name}
              </button>
            </form>
          ))}
        </div>
      )}

      {/* Create new tag */}
      <form action={createTag} className="flex gap-1.5 items-center mt-2">
        <input
          name="name"
          required
          placeholder="New tag..."
          className="border border-border rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-accent/20"
        />
        <input
          name="colour"
          type="color"
          defaultValue="#6b7280"
          className="w-6 h-6 rounded border-0 cursor-pointer"
        />
        <button type="submit" className="text-accent text-xs hover:underline">
          Create
        </button>
      </form>
    </div>
  );
}
