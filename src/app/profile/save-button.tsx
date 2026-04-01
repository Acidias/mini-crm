"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function ButtonInner() {
  const { pending } = useFormStatus();
  return (
    <span>
      {pending ? "Saving..." : "Save Settings"}
    </span>
  );
}

export default function SaveButton() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <button
        type="submit"
        onClick={() => {
          setTimeout(() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }, 300);
        }}
        className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
      >
        <ButtonInner />
      </button>
      {saved && (
        <span className="text-success text-sm font-medium animate-in fade-in">
          Settings saved!
        </span>
      )}
    </div>
  );
}
