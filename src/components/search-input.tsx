"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function SearchInput({ placeholder }: { placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`?${params.toString()}`);
    });
  }

  return (
    <input
      type="search"
      defaultValue={searchParams.get("q") || ""}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder={placeholder || "Search..."}
      className={`border border-border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent ${isPending ? "opacity-50" : ""}`}
    />
  );
}
