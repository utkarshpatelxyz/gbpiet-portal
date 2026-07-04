"use client";

import { useState, useTransition } from "react";
import { setHod } from "@/app/actions";

export default function HodToggle({
  facultyId,
  isHod,
}: {
  facultyId: string;
  isHod: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(isHod);

  function toggle() {
    const next = !value;
    setValue(next);
    startTransition(() => setHod(facultyId, next));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={value}
      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200 disabled:opacity-60 ${
        value
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {value ? "HOD" : "Mark as HOD"}
    </button>
  );
}
