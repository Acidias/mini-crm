"use client";

import { useState } from "react";
import Link from "next/link";

type Duplicate = { id: number; name: string; email?: string };

export default function DuplicateWarning({
  type,
  field,
  excludeId,
}: {
  type: "person" | "company";
  field: "email" | "name";
  excludeId?: number;
}) {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);

  async function checkDuplicate(value: string) {
    if (!value || value.length < 2) {
      setDuplicates([]);
      return;
    }
    const params = new URLSearchParams({ type, [field]: value });
    if (excludeId) params.set("excludeId", excludeId.toString());
    const res = await fetch(`/api/check-duplicate?${params}`);
    const data = await res.json();
    setDuplicates(data.duplicates || []);
  }

  return (
    <>
      <input
        name={field}
        type={field === "email" ? "email" : "text"}
        required={field === "name"}
        onBlur={(e) => checkDuplicate(e.target.value)}
        className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        placeholder={field === "email" ? "person@example.com" : ""}
      />
      {duplicates.length > 0 && (
        <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <p className="font-medium mb-1">Possible duplicate{duplicates.length > 1 ? "s" : ""} found:</p>
          {duplicates.map((d) => (
            <p key={d.id}>
              <Link
                href={`/${type === "person" ? "persons" : "companies"}/${d.id}`}
                className="text-accent hover:underline"
                target="_blank"
              >
                {d.name}
              </Link>
              {d.email && <span className="text-amber-600 ml-1">({d.email})</span>}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
