"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SemesterEndButton() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request() {
    if (
      !window.confirm(
        "Request semester end? Your faculty will review and approve your promotion to the next semester."
      )
    )
      return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("request_semester_end");
    if (error) setError(error.message);
    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={saving}
        onClick={request}
        className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Sending…" : "Request End of Semester"}
      </button>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
