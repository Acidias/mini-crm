"use client";

import { useRef } from "react";

export default function ConfirmDelete({
  action,
  label,
  message,
  className,
}: {
  action: () => void;
  label?: string;
  message?: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (!confirm(message || "Are you sure you want to delete this?")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className={className || "text-danger text-xs hover:underline"}
      >
        {label || "Delete"}
      </button>
    </form>
  );
}
