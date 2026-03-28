"use client";

import { useRef } from "react";

export default function BulkActions({
  children,
  entityType,
  extraActions,
}: {
  children: React.ReactNode;
  entityType: string;
  extraActions?: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function getSelectedIds(): number[] {
    if (!formRef.current) return [];
    const checkboxes = formRef.current.querySelectorAll<HTMLInputElement>(
      'input[name="ids"]:checked'
    );
    return Array.from(checkboxes).map((cb) => parseInt(cb.value));
  }

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (!formRef.current) return;
    const checkboxes = formRef.current.querySelectorAll<HTMLInputElement>(
      'input[name="ids"]'
    );
    checkboxes.forEach((cb) => (cb.checked = e.target.checked));
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

  async function handleBulkAction(action: string, data?: Record<string, unknown>) {
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
    <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
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
              onClick={() => handleBulkAction("done", { done: true })}
              className="border border-success text-success px-3 py-1 rounded-lg text-xs hover:bg-green-50 transition-colors"
            >
              Mark Done
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction("done", { done: false })}
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
            handleSelectAll({ target } as unknown as React.ChangeEvent<HTMLInputElement>);
          }
        }}
      >
        {children}
      </div>
    </form>
  );
}
