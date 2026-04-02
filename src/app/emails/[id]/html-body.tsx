"use client";

import { useState, useEffect } from "react";

// Content is sanitised via DOMPurify.sanitize() in the browser only
export default function HtmlEmailBody({ html }: { html: string }) {
  const [cleanHtml, setCleanHtml] = useState<string | null>(null);

  useEffect(() => {
    import("dompurify").then((DOMPurify) => {
      setCleanHtml(DOMPurify.default.sanitize(html));
    });
  }, [html]);

  if (cleanHtml === null) {
    return <p className="text-sm text-muted">Loading email content...</p>;
  }

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
