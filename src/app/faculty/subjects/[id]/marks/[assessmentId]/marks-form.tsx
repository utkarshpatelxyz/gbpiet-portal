"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  roll_no: string;
  enrollment_no: string;
  full_name: string;
};
type Existing = { marks_obtained: number; passed: boolean | null };

export default function MarksForm({
  assessmentId,
  isFinal,
  maxMarks,
  students,
  existing,
}: {
  assessmentId: string;
  isFinal: boolean;
  maxMarks: number;
  students: Student[];
  existing: Record<string, Existing>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      students.map((s) => [s.id, existing[s.id]?.marks_obtained?.toString() ?? ""])
    )
  );
  const [passed, setPassed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      students.map((s) => [s.id, existing[s.id]?.passed ?? true])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setError(null);
    const rows = [];
    for (const s of students) {
      const raw = values[s.id]?.trim();
      if (raw === "" || raw === undefined) continue;
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0 || n > maxMarks) {
        setError(`Marks for ${s.full_name} must be between 0 and ${maxMarks}.`);
        return;
      }
      rows.push({
        assessment_id: assessmentId,
        student_id: s.id,
        marks_obtained: n,
        passed: isFinal ? passed[s.id] : null,
      });
    }
    if (rows.length === 0) {
      setError("Enter marks for at least one student.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("marks")
      .upsert(rows, { onConflict: "assessment_id,student_id" });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Roll</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Marks (out of {maxMarks})
              </th>
              {isFinal && (
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Result</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2.5 text-sm text-slate-700">{s.roll_no}</td>
                <td className="px-4 py-2.5">
                  <p className="text-sm font-medium text-slate-900">{s.full_name}</p>
                  <p className="text-xs text-slate-500">{s.enrollment_no}</p>
                </td>
                <td className="px-4 py-2.5">
                  <label className="sr-only" htmlFor={`m-${s.id}`}>
                    Marks for {s.full_name}
                  </label>
                  <input
                    id={`m-${s.id}`}
                    type="number"
                    min={0}
                    max={maxMarks}
                    step="0.5"
                    value={values[s.id]}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [s.id]: e.target.value }))
                    }
                    className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </td>
                {isFinal && (
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPassed((p) => ({ ...p, [s.id]: true }))}
                        className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors duration-150 ${
                          passed[s.id]
                            ? "bg-emerald-600 text-white"
                            : "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => setPassed((p) => ({ ...p, [s.id]: false }))}
                        className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors duration-150 ${
                          passed[s.id] === false
                            ? "bg-rose-600 text-white"
                            : "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                        }`}
                      >
                        Fail
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      )}

      <div className="flex items-center justify-end gap-4">
        {savedAt && <p className="text-sm text-emerald-700">Saved at {savedAt}</p>}
        {isFinal && (
          <p className="text-sm text-slate-500">
            Marking Fail records a backlog for that student.
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save marks"}
        </button>
      </div>
    </div>
  );
}
