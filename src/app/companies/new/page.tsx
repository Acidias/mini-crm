import Link from "next/link";
import { createCompany } from "@/actions/companies";
import DuplicateWarning from "@/components/duplicate-warning";

export default function NewCompanyPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/companies" className="text-muted text-sm hover:text-foreground">
          &larr; Back to Companies
        </Link>
        <h1 className="text-2xl font-bold mt-2">Add Company</h1>
      </div>
      <form action={createCompany} className="bg-card-bg rounded-xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Company Name *</label>
            <DuplicateWarning type="company" field="name" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Industry</label>
            <input
              name="industry"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Website</label>
            <input
              name="website"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input
              name="phone"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <input
              name="address"
              className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Save Company
          </button>
          <Link
            href="/companies"
            className="border border-border px-5 py-2 rounded-lg text-sm text-muted hover:bg-stone-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
