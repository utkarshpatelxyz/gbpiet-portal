"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewPlan({ usedSemesters }: { usedSemesters: number[] }) {
  const router = useRouter();
  const [semester, setSemester] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = [1, 2, 3, 4, 5, 6, 7, 8].filter((s) => !usedSemesters.includes(s));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (semester === "") return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: hod } = await supabase
      .from("hods")
      .select("branch_id")
      .eq("id", user!.id)
      .single();
    const { data, error } = await supabase
      .from("semester_plans")
      .insert({ branch_id: hod!.branch_id, semester: Number(semester), created_by: user!.id })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/hod/plans/${data.id}`);
    router.refresh();
  }

  if (available.length === 0) return null;

  return (
    <form
      onSubmit={create}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label htmlFor="psem" className="block text-sm font-medium text-slate-700">
          New plan for semester
        </label>
        <select
          id="psem"
          required
          value={semester}
          onChange={(e) => setSemester(e.target.value === "" ? "" : Number(e.target.value))}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Select…</option>
          {available.map((s) => (
            <option key={s} value={s}>
              Semester {s} (Year {Math.ceil(s / 2)})
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={saving || semester === ""}
        className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Creating…" : "Create plan"}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </form>
  );
}
