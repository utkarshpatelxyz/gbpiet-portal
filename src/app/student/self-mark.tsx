"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SelfMark({
  sessionId,
  current,
}: {
  sessionId: string;
  current: "present" | "on_leave" | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark(status: "present" | "on_leave") {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("attendance_records").upsert(
      {
        session_id: sessionId,
        student_id: user.id,
        self_status: status,
        self_marked_at: new Date().toISOString(),
      },
      { onConflict: "session_id,student_id" }
    );
    if (error) setError(error.message);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving || current === "present"}
          onClick={() => mark("present")}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed ${
            current === "present"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          {current === "present" ? "Marked Present" : "Mark Present"}
        </button>
        <button
          type="button"
          disabled={saving || current === "on_leave"}
          onClick={() => mark("on_leave")}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed ${
            current === "on_leave"
              ? "bg-amber-500 text-white"
              : "border border-amber-500 text-amber-700 hover:bg-amber-50"
          }`}
        >
          {current === "on_leave" ? "Marked On Leave" : "On Leave"}
        </button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
