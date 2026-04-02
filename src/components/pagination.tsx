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
    <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/40">
      <p className="text-xs text-muted">
        {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex gap-1">
        {page > 1 && (
          <Link
            href={buildUrl(page - 1)}
            className="border border-border/60 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:bg-stone-50 hover:text-foreground transition-colors"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                p === page
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:bg-stone-50 hover:text-foreground"
              }`}
            >
              {p}
            </Link>
          );
        })}
        {page < totalPages && (
          <Link
            href={buildUrl(page + 1)}
            className="border border-border/60 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:bg-stone-50 hover:text-foreground transition-colors"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
