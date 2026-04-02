import Link from "next/link";

const PAGE_SIZE = 20;

export { PAGE_SIZE };

export default function Pagination({
  total,
  page,
  baseUrl,
  searchParams,
}: {
  total: number;
  page: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  function buildUrl(p: number) {
    const params = new URLSearchParams(searchParams || {});
    if (p > 1) params.set("page", p.toString());
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-muted">
        Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex gap-1">
        {page > 1 && (
          <Link
            href={buildUrl(page - 1)}
            className="border border-border px-3 py-1 rounded text-sm hover:bg-stone-50"
          >
            Prev
          </Link>
        )}
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p: number;
          if (totalPages <= 7) {
            p = i + 1;
          } else if (page <= 4) {
            p = i + 1;
          } else if (page >= totalPages - 3) {
            p = totalPages - 6 + i;
          } else {
            p = page - 3 + i;
          }
          return (
            <Link
              key={p}
              href={buildUrl(p)}
              className={`px-3 py-1 rounded text-sm ${
                p === page
                  ? "bg-accent text-white"
                  : "border border-border hover:bg-stone-50"
              }`}
            >
              {p}
            </Link>
          );
        })}
        {page < totalPages && (
          <Link
            href={buildUrl(page + 1)}
            className="border border-border px-3 py-1 rounded text-sm hover:bg-stone-50"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
