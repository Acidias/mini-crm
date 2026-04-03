"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Persists sort preferences per page in localStorage.
 * - If the URL has sort params, saves them.
 * - If the URL has no sort params, restores saved ones.
 */
export default function SortPersistence({ pageKey }: { pageKey: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const restored = useRef(false);

  useEffect(() => {
    const sort = searchParams.get("sort");
    const order = searchParams.get("order");
    const storageKey = `sort:${pageKey}`;

    if (sort) {
      // Save current sort preference
      localStorage.setItem(storageKey, JSON.stringify({ sort, order: order || "asc" }));
    } else if (!restored.current) {
      // No sort in URL - try to restore saved preference
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const { sort: savedSort, order: savedOrder } = JSON.parse(saved);
          if (savedSort) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("sort", savedSort);
            params.set("order", savedOrder || "asc");
            restored.current = true;
            router.replace(`?${params.toString()}`);
          }
        } catch {
          // Ignore invalid stored data
        }
      }
    }
  }, [searchParams, pageKey, router]);

  return null;
}
