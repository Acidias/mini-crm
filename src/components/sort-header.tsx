"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  searchParams: _sp,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: string;
  searchParams?: Record<string, string>;
}) {
  const urlParams = useSearchParams();
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === "asc" ? "desc" : "asc";

  // Preserve all current URL params (including multi-value filter params)
  const params = new URLSearchParams(urlParams.toString());
  params.set("sort", field);
  params.set("order", nextOrder);
  params.delete("page");

  return (
    <Link href={`?${params.toString()}`} className="hover:text-foreground group">
      {label}
      <span className="ml-1 text-[10px]">
        {isActive ? (currentOrder === "asc" ? "\u25B2" : "\u25BC") : "\u25B4"}
      </span>
    </Link>
  );
}
