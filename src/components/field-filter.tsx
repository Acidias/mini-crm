"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export type FilterOption = {
  label: string;
  value: string; // e.g. "has:email", "missing:linkedin"
};

export default function FieldFilter({ options }: { options: FilterOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = searchParams.getAll("filter");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const current = params.getAll("filter");
    if (current.includes(value)) {
      params.delete("filter");
      current.filter((v) => v !== value).forEach((v) => params.append("filter", v));
    } else {
      params.append("filter", value);
    }
    router.replace(`?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("filter");
    params.delete("page");
    router.replace(`?${params.toString()}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 border rounded-lg px-3 py-2.5 text-sm transition-colors ${
          active.length > 0
            ? "border-accent bg-accent/5 text-accent"
            : "border-border/60 bg-stone-50/50 text-stone-500 hover:border-stone-300"
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filter
        {active.length > 0 && (
          <span className="bg-accent text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {active.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-border/60 rounded-xl shadow-lg z-50 w-56 py-2">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
            Filter by field
          </div>
          {options.map((opt) => {
            const isActive = active.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  isActive ? "bg-accent/5 text-accent" : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isActive ? "bg-accent border-accent" : "border-stone-300"
                }`}>
                  {isActive && (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 8 6.5 11.5 13 5" />
                    </svg>
                  )}
                </span>
                {opt.label}
              </button>
            );
          })}
          {active.length > 0 && (
            <div className="border-t border-border/40 mt-1 pt-1 px-3">
              <button
                onClick={clearAll}
                className="text-xs text-stone-400 hover:text-stone-600 py-1.5 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
