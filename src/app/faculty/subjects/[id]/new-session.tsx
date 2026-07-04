"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils";

export default function NewSession({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert({ subject_id: subjectId, session_date: date })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "A session for this date already exists."
          : error.message
      );
      return;
    }
    router.push(`/faculty/subjects/${subjectId}/sessions/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={start} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="sdate" className="block text-sm font-medium text-slate-700">
          Class date
        </label>
        <input
          id="sdate"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Opening…" : "Open attendance"}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </form>
  );
}
