"use client";

import DOMPurify from "dompurify";

// Content is sanitised via DOMPurify.sanitize() before rendering
export default function HtmlEmailBody({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
