"use client";

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
  return (
    <form
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
