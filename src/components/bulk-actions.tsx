"use client";

import { useRef, useState, useEffect } from "react";

export default function BulkActions({
  children,
  entityType,
}: {
  children: React.ReactNode;
  entityType: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    function handleChange() {
      if (!containerRef.current) return;
      const checked = containerRef.current.querySelectorAll<HTMLInputElement>(
        'input[name="ids"]:checked'
      );
      setSelectedCount(checked.length);
    }
    const el = containerRef.current;
    if (el) el.addEventListener("change", handleChange);
    return () => { if (el) el.removeEventListener("change", handleChange); };
  }, []);

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
    setSelectedCount(checked ? checkboxes.length : 0);
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
      {/* Floating action bar - only shows when items are selected */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-stone-800 text-white rounded-xl shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2">
          <span className="text-stone-300 text-xs font-medium">{selectedCount} selected</span>
          <div className="w-px h-4 bg-stone-600" />
          <button
            type="button"
            onClick={handleBulkDelete}
            className="text-rose-300 hover:text-rose-200 text-xs font-medium transition-colors"
          >
            Delete
          </button>
          {entityType === "todos" && (
            <>
              <button
                type="button"
                onClick={() => handleBulkAction({ done: true })}
                className="text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-colors"
              >
                Mark Done
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction({ done: false })}
                className="text-stone-400 hover:text-stone-200 text-xs font-medium transition-colors"
              >
                Mark Pending
              </button>
            </>
          )}
        </div>
      )}
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
