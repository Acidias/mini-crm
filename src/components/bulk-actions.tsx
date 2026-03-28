"use client";

import { useRef } from "react";

export default function BulkActions({
  children,
  entityType,
}: {
  children: React.ReactNode;
  entityType: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  function getSelectedIds(): number[] {
    if (!containerRef.current) return [];
    const checkboxes = containerRef.current.querySelectorAll<HTMLInputElement>(
      'input[name="ids"]:checked'
    );
    return Array.from(checkboxes).map((cb) => parseInt(cb.value));
  }

  function handleSelectAll(checked: boolean) {
    if (!containerRef.current) return;
    const checkboxes = containerRef.current.querySelectorAll<HTMLInputElement>(
      'input[name="ids"]'
    );
    checkboxes.forEach((cb) => (cb.checked = checked));
  }

  async function handleBulkDelete() {
    const ids = getSelectedIds();
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} item(s)?`)) return;
    const res = await fetch(`/api/bulk/${entityType}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) window.location.reload();
  }

  async function handleBulkAction(data: Record<string, unknown>) {
    const ids = getSelectedIds();
    if (ids.length === 0) return;
    const res = await fetch(`/api/bulk/${entityType}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, ...data }),
    });
    if (res.ok) window.location.reload();
  }

  return (
    <div ref={containerRef}>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={handleBulkDelete}
          className="border border-danger text-danger px-3 py-1 rounded-lg text-xs hover:bg-red-50 transition-colors"
        >
          Delete Selected
        </button>
        {entityType === "todos" && (
          <>
            <button
              type="button"
              onClick={() => handleBulkAction({ done: true })}
              className="border border-success text-success px-3 py-1 rounded-lg text-xs hover:bg-green-50 transition-colors"
            >
              Mark Done
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction({ done: false })}
              className="border border-border text-muted px-3 py-1 rounded-lg text-xs hover:bg-gray-50 transition-colors"
            >
              Mark Pending
            </button>
          </>
        )}
      </div>
      <div
        onClick={(e) => {
          const target = e.target as HTMLInputElement;
          if (target.dataset.selectAll !== undefined) {
            handleSelectAll(target.checked);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
