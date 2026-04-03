"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  className,
  pendingText,
  formAction,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  formAction?: (formData: FormData) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      formAction={formAction}
      className={`${className} ${pending ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {pending ? (pendingText || "Sending...") : children}
    </button>
  );
}
