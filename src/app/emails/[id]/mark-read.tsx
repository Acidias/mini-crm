"use client";

import { useEffect, useRef } from "react";
import { markEmailRead } from "@/actions/emails";

export default function MarkAsRead({ emailId }: { emailId: number }) {
  const marked = useRef(false);

  useEffect(() => {
    if (!marked.current) {
      marked.current = true;
      markEmailRead(emailId);
    }
  }, [emailId]);

  return null;
}
