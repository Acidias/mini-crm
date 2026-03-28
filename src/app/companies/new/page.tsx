import { createCompany } from "@/actions/companies";

export default function NewCompanyPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add Company</h1>
      <form action={createCompany} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            name="name"
            required
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Website</label>
          <input
            name="website"
            className="border rounded w-full px-3 py-2"
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Industry</label>
          <input
            name="industry"
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="border rounded w-full px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </form>
    </div>
  );
}
